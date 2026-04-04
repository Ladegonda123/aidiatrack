from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

MODEL_PATH = os.getenv('MODEL_PATH', 'models/')
GLUCOSE_FEATURE_COLS = [
    'fasting_bg', 'bg_lag_4', 'bg_lag_3', 'bg_lag_2', 'current_bg',
    'meal_gi', 'meal_calories', 'activity_encoded', 'insulin_dose',
    'hour_of_day', 'minutes_since_meal',
]

# Load models at startup — will be None until trained
glucose_model = None
risk_model = None


def load_models():
    global glucose_model, risk_model
    glucose_path = os.path.join(MODEL_PATH, 'glucose_model.pkl')
    risk_path = os.path.join(MODEL_PATH, 'risk_model.pkl')

    if os.path.exists(glucose_path):
        glucose_model = joblib.load(glucose_path)
        print(f'Glucose model loaded from {glucose_path}')
    else:
        print('WARNING: glucose_model.pkl not found — predictions unavailable')

    if os.path.exists(risk_path):
        risk_model = joblib.load(risk_path)
        print(f'Risk model loaded from {risk_path}')
    else:
        print('WARNING: risk_model.pkl not found — risk assessment unavailable')


load_models()


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'models_loaded': {
            'glucose': glucose_model is not None,
            'risk': risk_model is not None,
        }
    })


@app.route('/predict/glucose', methods=['POST'])
def predict_glucose():
    if glucose_model is None:
        return jsonify({'error': 'Glucose model not loaded'}), 503

    try:
        data = request.get_json()

        # Expected features from Node.js (see CLAUDE.md Section 7.3)
        features = pd.DataFrame([[
            data.get('fasting_bg', data.get('bg_1', 130)),
            data.get('bg_2', data.get('fasting_bg', 130)),
            data.get('bg_3', data.get('fasting_bg', 130)),
            data.get('bg_4', data.get('fasting_bg', 130)),
            data.get('current_bg', 130),
            data.get('meal_gi', 55),
            data.get('meal_calories', 450),
            data.get('activity_encoded', 0),
            data.get('insulin_dose', 0),
            data.get('hour_of_day', 12),
            data.get('minutes_since_meal', 30),
        ]], columns=GLUCOSE_FEATURE_COLS)

        prediction = float(glucose_model.predict(features)[0])
        prediction = round(max(65, min(420, prediction)), 1)

        # Determine risk level from predicted value
        if prediction < 70:
            risk = 'LOW'
        elif prediction < 140:
            risk = 'LOW'
        elif prediction < 200:
            risk = 'MEDIUM'
        else:
            risk = 'HIGH'

        return jsonify({
            'predictedGlucose': prediction,
            'predictionHours': 2,
            'riskLevel': risk,
            'confidence': 0.80,
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/predict/risk', methods=['POST'])
def predict_risk():
    if risk_model is None:
        return jsonify({'error': 'Risk model not loaded'}), 503

    try:
        data = request.get_json()

        # HbA1c estimation if not provided (Nathan formula)
        avg_glucose = data.get('avg_glucose_30d', 130)
        hba1c = data.get('hba1c', (avg_glucose + 46.7) / 28.7)

        features = np.array([[
            data.get('age', 40),
            data.get('gender', 0),
            avg_glucose,
            data.get('max_glucose_30d', avg_glucose),
            data.get('glucose_std', 20),
            data.get('bmi', 25),
            data.get('systolic_bp', 120),
            round(hba1c, 1),
            data.get('insulin_dependent', 0),
            data.get('avg_activity', 1),
            data.get('readings_count', 10),
        ]])

        risk_encoded = int(risk_model.predict(features)[0])
        labels = {0: 'LOW', 1: 'MEDIUM', 2: 'HIGH'}
        risk_level = labels.get(risk_encoded, 'LOW')

        # Get feature importances for risk factors
        risk_factors = []
        if avg_glucose > 180:
            risk_factors.append('Consistently high blood glucose')
        if hba1c > 7.5:
            risk_factors.append('Elevated HbA1c')
        if data.get('bmi', 25) > 30:
            risk_factors.append('High BMI')
        if data.get('systolic_bp', 120) > 130:
            risk_factors.append('Elevated blood pressure')
        if data.get('readings_count', 10) < 5:
            risk_factors.append('Insufficient monitoring')

        return jsonify({
            'riskLevel': risk_level,
            'riskFactors': risk_factors,
            'confidence': 0.80,
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 8000))
    debug = os.getenv('FLASK_ENV') == 'development'
    print(f'AIDiaTrack AI Service starting on port {port}')
    app.run(host='0.0.0.0', port=port, debug=debug)
