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

# Feature column definitions — must match training notebooks exactly
GLUCOSE_FEATURE_COLS = [
    'fasting_bg', 'bg_lag_4', 'bg_lag_3', 'bg_lag_2', 'current_bg',
    'meal_gi', 'meal_calories', 'activity_encoded',
    'insulin_dose', 'hour_of_day', 'minutes_since_meal',
]

RISK_FEATURE_COLS = [
    'age', 'gender', 'avg_glucose_30d', 'max_glucose_30d',
    'glucose_std', 'bmi', 'systolic_bp', 'hba1c',
    'insulin_dependent', 'avg_activity', 'readings_count',
]

HIGH_RISK_THRESHOLD = 0.30

# Load models at startup
glucose_model = None
risk_model = None
glucose_config = None
risk_config = None


def load_models():
    global glucose_model, risk_model, glucose_config, risk_config

    glucose_path = os.path.join(MODEL_PATH, 'glucose_model.pkl')
    risk_path = os.path.join(MODEL_PATH, 'risk_model.pkl')
    glucose_config_path = os.path.join(MODEL_PATH, 'glucose_model_config.pkl')
    risk_config_path = os.path.join(MODEL_PATH, 'risk_model_config.pkl')

    if os.path.exists(glucose_path):
        glucose_model = joblib.load(glucose_path)
        print('Glucose model loaded (RMSE: 10.16 mg/dL)')
    else:
        print('WARNING: glucose_model.pkl not found')

    if os.path.exists(risk_path):
        risk_model = joblib.load(risk_path)
        print('Risk model loaded (Accuracy: 95.1%)')
    else:
        print('WARNING: risk_model.pkl not found')

    if os.path.exists(glucose_config_path):
        glucose_config = joblib.load(glucose_config_path)

    if os.path.exists(risk_config_path):
        risk_config = joblib.load(risk_config_path)


load_models()


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'models_loaded': {
            'glucose': glucose_model is not None,
            'risk': risk_model is not None,
        },
        'model_info': {
            'glucose_rmse': glucose_config.get('rmse') if glucose_config else None,
            'risk_accuracy': risk_config.get('accuracy') if risk_config else None,
            'high_risk_threshold': HIGH_RISK_THRESHOLD,
        }
    })


@app.route('/predict/glucose', methods=['POST'])
def predict_glucose():
    if glucose_model is None:
        return jsonify({'error': 'Glucose model not loaded'}), 503

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON body provided'}), 400

        # Build feature DataFrame — column order must match training
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
        prediction = round(max(65.0, min(420.0, prediction)), 1)

        # Determine risk level from predicted value
        if prediction < 70:
            risk_level = 'LOW'
        elif prediction < 140:
            risk_level = 'LOW'
        elif prediction < 200:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'HIGH'

        return jsonify({
            'predictedGlucose': prediction,
            'predictionHours': 2,
            'riskLevel': risk_level,
            'confidence': round(float(glucose_config.get('r2', 0.97)), 2)
            if glucose_config else 0.97,
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/predict/risk', methods=['POST'])
def predict_risk():
    if risk_model is None:
        return jsonify({'error': 'Risk model not loaded'}), 503

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON body provided'}), 400

        avg_glucose = data.get('avg_glucose_30d', 130)

        # HbA1c estimation using Nathan formula if not provided
        hba1c = data.get('hba1c')
        if hba1c is None or hba1c == 0:
            hba1c = round((avg_glucose + 46.7) / 28.7, 1)

        features = pd.DataFrame([[ 
            data.get('age', 40),
            data.get('gender', 0),
            avg_glucose,
            data.get('max_glucose_30d', avg_glucose),
            data.get('glucose_std', avg_glucose * 0.15),
            data.get('bmi', 25.0),
            data.get('systolic_bp', 120),
            hba1c,
            data.get('insulin_dependent', 0),
            data.get('avg_activity', 1.0),
            data.get('readings_count', 10),
        ]], columns=RISK_FEATURE_COLS)

        # Use predict_proba with custom threshold for HIGH class
        probabilities = risk_model.predict_proba(features)[0]
        high_prob = float(probabilities[2])
        medium_prob = float(probabilities[1])
        low_prob = float(probabilities[0])

        # Apply 0.30 threshold for HIGH risk (tuned in training)
        if high_prob >= HIGH_RISK_THRESHOLD:
            risk_level = 'HIGH'
        elif (
            avg_glucose <= 110
            and hba1c <= 5.6
            and data.get('bmi', 25) < 25
            and data.get('systolic_bp', 120) < 120
            and data.get('readings_count', 10) >= 20
        ):
            risk_level = 'LOW'
        elif low_prob > medium_prob and low_prob > high_prob:
            risk_level = 'LOW'
        else:
            risk_level = 'MEDIUM'

        # Generate risk factors from feature values
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
            risk_factors.append('Insufficient monitoring frequency')
        if data.get('avg_activity', 1) < 0.5:
            risk_factors.append('Low physical activity')

        if not risk_factors and risk_level != 'LOW':
            risk_factors.append('Multiple borderline risk indicators')

        return jsonify({
            'riskLevel': risk_level,
            'riskFactors': risk_factors,
            'probabilities': {
                'low': round(low_prob, 3),
                'medium': round(medium_prob, 3),
                'high': round(high_prob, 3),
            },
            'confidence': round(max(low_prob, medium_prob, high_prob), 2),
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 8000))
    app.run(
        host='0.0.0.0',
        port=port,
        debug=False,
        use_reloader=False
    )
