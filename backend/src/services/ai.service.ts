import { HealthRecordInput, GlucosePrediction } from "../types";

export interface GlucoseFeatures extends HealthRecordInput {
  patientId: number;
}

export const predictGlucose = async (
  _features: GlucoseFeatures,
): Promise<GlucosePrediction | null> => {
  return null;
};
