export type UserRole = "PATIENT" | "DOCTOR";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type ActivityLevel = "NONE" | "LOW" | "MODERATE" | "HIGH";

export interface AuthUser {
  userId: number;
  role: UserRole;
  email?: string;
  fullName?: string;
  doctorId?: number | null;
  language?: string;
}

export interface HealthRecordInput {
  bloodGlucose: number;
  weightKg?: number;
  heightCm?: number;
  bloodPressure?: string;
  mealDesc?: string;
  calories?: number;
  activityLevel?: ActivityLevel;
  insulinDose?: number;
  hba1c?: number;
  notes?: string;
}

export interface GlucosePrediction {
  predictedGlucose: number | null;
  predictionHours: number;
  confidence?: number | null;
  riskLevel: RiskLevel;
  modelVersion?: string | null;
  predictionAvailable: boolean;
}

export interface RiskAssessment {
  riskLevel: RiskLevel;
  score?: number;
  factors: string[];
  recommendation?: string;
}

export interface ChatMessage {
  id?: number;
  senderId: number;
  receiverId: number;
  content: string;
  isRead?: boolean;
  attachmentUrl?: string | null;
  sentAt?: Date | string;
}

export interface MedicationInput {
  drugName: string;
  dosage: string;
  frequency: string;
  reminderTimes: string[];
  prescribedBy?: number;
}

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  message: string;
  details?: unknown;
}
