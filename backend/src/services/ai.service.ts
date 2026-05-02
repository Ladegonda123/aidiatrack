import axios from "axios";
import prisma from "../config/database";
import { ENV } from "../config/env";
import logger from "../utils/logger";

export interface GlucoseFeatures {
  bgReadings: number[];
  currentBg: number;
  mealGi: number;
  mealCalories: number;
  activityEncoded: number;
  insulinDose: number;
  hourOfDay: number;
  minutesSinceMeal: number;
}

export interface RiskFeatures {
  age: number;
  gender: number;
  avgGlucose30d: number;
  maxGlucose30d: number;
  glucoseStd: number;
  bmi: number;
  systolicBp: number;
  hba1c?: number;
  insulinDependent: number;
  avgActivity: number;
  readingsCount: number;
}

export interface GlucosePredictionResult {
  predictedGlucose: number;
  predictionHours: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
}

export interface RiskAssessmentResult {
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskFactors: string[];
  confidence: number;
}

const aiClient = axios.create({
  baseURL: ENV.AI_SERVICE_URL,
  timeout: 5000,
  headers: { "Content-Type": "application/json" },
});

const padReadings = (
  readings: number[],
  currentBg: number,
): {
  bg_1: number;
  bg_2: number;
  bg_3: number;
  bg_4: number;
} => {
  const padded = [...readings];

  while (padded.length < 4) {
    padded.unshift(currentBg);
  }

  const latestFour = padded.slice(-4);

  return {
    bg_1: latestFour[0] ?? currentBg,
    bg_2: latestFour[1] ?? currentBg,
    bg_3: latestFour[2] ?? currentBg,
    bg_4: latestFour[3] ?? currentBg,
  };
};

export const predictGlucose = async (
  features: GlucoseFeatures,
): Promise<GlucosePredictionResult | null> => {
  try {
    const bgPadded = padReadings(features.bgReadings, features.currentBg);

    const payload = {
      ...bgPadded,
      fasting_bg: features.bgReadings[0] ?? features.currentBg,
      current_bg: features.currentBg,
      meal_gi: features.mealGi,
      meal_calories: features.mealCalories,
      activity_encoded: features.activityEncoded,
      insulin_dose: features.insulinDose,
      hour_of_day: features.hourOfDay,
      minutes_since_meal: features.minutesSinceMeal,
    };

    const response = await aiClient.post("/predict/glucose", payload);
    return response.data as GlucosePredictionResult;
  } catch (error: unknown) {
    logger.warn("AI glucose prediction unavailable", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
};

export const assessRisk = async (
  features: RiskFeatures,
): Promise<RiskAssessmentResult | null> => {
  try {
    const payload = {
      age: features.age,
      gender: features.gender,
      avg_glucose_30d: features.avgGlucose30d,
      max_glucose_30d: features.maxGlucose30d,
      glucose_std: features.glucoseStd,
      bmi: features.bmi,
      systolic_bp: features.systolicBp,
      hba1c: features.hba1c,
      insulin_dependent: features.insulinDependent,
      avg_activity: features.avgActivity,
      readings_count: features.readingsCount,
    };

    const response = await aiClient.post("/predict/risk", payload);
    return response.data as RiskAssessmentResult;
  } catch (error: unknown) {
    logger.warn("AI risk assessment unavailable", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
};

export const buildGlucoseFeatures = async (
  patientId: number,
  currentRecord: {
    id: number;
    bloodGlucose: number;
    mealGi: number | null;
    mealCalories: number | null;
    activityLevel: string;
    insulinDose: number | null;
    recordedAt: Date;
  },
): Promise<GlucoseFeatures> => {
  const previousRecords = await prisma.healthRecord.findMany({
    where: {
      patientId,
      id: {
        lt: currentRecord.id,
      },
    },
    orderBy: { recordedAt: "desc" },
    take: 4,
    select: { bloodGlucose: true, recordedAt: true },
  });

  const bgReadings = previousRecords
    .reverse()
    .map((record) => record.bloodGlucose);

  while (bgReadings.length < 4) {
    bgReadings.unshift(currentRecord.bloodGlucose);
  }

  bgReadings.push(currentRecord.bloodGlucose);

  const activityMap: Record<string, number> = {
    NONE: 0,
    LOW: 1,
    MODERATE: 2,
    HIGH: 3,
  };

  const hour = new Date(currentRecord.recordedAt).getHours();
  const minutesSinceMeal =
    hour >= 6 && hour <= 9
      ? 30
      : hour >= 12 && hour <= 14
        ? 30
        : hour >= 18 && hour <= 21
          ? 30
          : 120;

  return {
    bgReadings,
    currentBg: currentRecord.bloodGlucose,
    mealGi: currentRecord.mealGi ?? 55,
    mealCalories: currentRecord.mealCalories ?? 450,
    activityEncoded: activityMap[currentRecord.activityLevel] ?? 0,
    insulinDose: currentRecord.insulinDose ?? 0,
    hourOfDay: hour,
    minutesSinceMeal,
  };
};

export const buildRiskFeatures = async (
  patientId: number,
  patientProfile: {
    dateOfBirth: Date | null;
    gender: string | null;
  },
): Promise<RiskFeatures | null> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [records, patient] = await Promise.all([
    prisma.healthRecord.findMany({
      where: {
        patientId,
        recordedAt: { gte: thirtyDaysAgo },
      },
      select: {
        bloodGlucose: true,
        weightKg: true,
        bloodPressure: true,
        hba1c: true,
        insulinDose: true,
        activityLevel: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: patientId },
      select: {
        weightKg: true,
        heightCm: true,
      },
    }),
  ]);

  if (records.length === 0) {
    return null;
  }

  const bgValues = records.map((record) => record.bloodGlucose);
  const avgGlucose =
    bgValues.reduce((sum, value) => sum + value, 0) / bgValues.length;
  const maxGlucose = Math.max(...bgValues);
  const glucoseStd = Math.sqrt(
    bgValues.reduce((sum, value) => sum + Math.pow(value - avgGlucose, 2), 0) /
      bgValues.length,
  );

  // Use latest weight from health records, fall back to user profile, default to 70
  const latestWeight =
    records.find((record) => record.weightKg)?.weightKg ??
    patient?.weightKg ??
    70;

  // Use patient's height from profile, default to 170 cm
  const heightCm = patient?.heightCm ?? 170;
  const heightM = heightCm / 100;
  const bmi = latestWeight / (heightM * heightM);

  const latestBp = records.find(
    (record) => record.bloodPressure,
  )?.bloodPressure;
  const systolicBp = latestBp
    ? Number.parseInt(latestBp.split("/")[0] ?? "120", 10)
    : 120;

  const latestHba1c =
    records.find((record) => record.hba1c)?.hba1c ?? undefined;

  const activityMap: Record<string, number> = {
    NONE: 0,
    LOW: 1,
    MODERATE: 2,
    HIGH: 3,
  };
  const avgActivity =
    records.reduce(
      (sum, record) => sum + (activityMap[record.activityLevel] ?? 0),
      0,
    ) / records.length;

  const age = patientProfile.dateOfBirth
    ? Math.floor(
        (Date.now() - patientProfile.dateOfBirth.getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      )
    : 40;

  const gender =
    patientProfile.gender?.toLowerCase() === "male" ||
    patientProfile.gender?.toLowerCase() === "m"
      ? 1
      : 0;

  const insulinDependent = records.some(
    (record) => (record.insulinDose ?? 0) > 0,
  )
    ? 1
    : 0;

  return {
    age,
    gender,
    avgGlucose30d: Math.round(avgGlucose * 10) / 10,
    maxGlucose30d: maxGlucose,
    glucoseStd: Math.round(glucoseStd * 10) / 10,
    bmi: Math.round(bmi * 10) / 10,
    systolicBp,
    hba1c: latestHba1c,
    insulinDependent,
    avgActivity: Math.round(avgActivity * 10) / 10,
    readingsCount: records.length,
  };
};
