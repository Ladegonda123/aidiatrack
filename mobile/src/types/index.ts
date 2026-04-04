export type UserRole = "PATIENT" | "DOCTOR";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type ActivityLevel = "NONE" | "LOW" | "MODERATE" | "HIGH";
export type Language = "en" | "rw";

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  doctorId?: number;
  language: Language;
  fcmToken?: string;
}

export interface HealthRecord {
  id: number;
  patientId: number;
  bloodGlucose: number;
  weightKg?: number;
  bloodPressure?: string;
  mealDesc?: string;
  mealGi?: number;
  mealCalories?: number;
  activityLevel: ActivityLevel;
  insulinDose?: number;
  hba1c?: number;
  notes?: string;
  recordedAt: string;
}

export interface Prediction {
  id: number;
  patientId: number;
  predictedGlucose?: number;
  predictionHours: number;
  riskLevel: RiskLevel;
  riskFactors?: string[];
  confidence?: number;
  createdAt: string;
}

export interface Medication {
  id: number;
  patientId: number;
  drugName: string;
  dosage: string;
  frequency: string;
  reminderTimes: string[];
  isActive: boolean;
}

export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  isRead: boolean;
  sentAt: string;
}

export interface FoodItem {
  id: number;
  name: string;
  nameKin?: string;
  category: string;
  glycemicIndex: number;
  glycemicLoad: number;
  caloriesPer100g: number;
  diabetesRating: "excellent" | "good" | "moderate" | "avoid";
  notes?: string;
  giCategory: "none" | "low" | "medium" | "high";
}

export interface HealthSummary {
  averageBg: number;
  lastReading: HealthRecord | null;
  totalRecords: number;
  trend: { date: string; value: number }[];
}

export interface DietRecommendation {
  bloodGlucose: number;
  advice: string;
  foodsToEat: string[];
  foodsToAvoid: string[];
  recordDate: string;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  PatientTabs: undefined;
  DoctorTabs: undefined;
  PatientDetail: { patientId: number; patientName: string };
  DoctorChat: { patientId: number; patientName: string };
};

export type PatientTabParamList = {
  Dashboard: undefined;
  LogHealth: undefined;
  Predictions: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type DoctorTabParamList = {
  DoctorDashboard: undefined;
  DoctorChatList: undefined;
  DoctorProfile: undefined;
};
