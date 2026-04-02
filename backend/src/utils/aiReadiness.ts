import prisma from "../config/database";

export interface AIReadinessResult {
  ready: boolean;
  recordCount: number;
  minimumRequired: number;
  message: string;
}

// Check if a patient has enough records to run AI prediction
export const checkAIReadiness = async (
  patientId: number,
): Promise<AIReadinessResult> => {
  const MINIMUM_RECORDS = 3;

  const recordCount = await prisma.healthRecord.count({
    where: { patientId },
  });

  if (recordCount < MINIMUM_RECORDS) {
    return {
      ready: false,
      recordCount,
      minimumRequired: MINIMUM_RECORDS,
      message: `AI predictions need at least ${MINIMUM_RECORDS} blood glucose readings. You have ${recordCount}. Keep logging — predictions will unlock soon.`,
    };
  }

  return {
    ready: true,
    recordCount,
    minimumRequired: MINIMUM_RECORDS,
    message: "AI predictions are available.",
  };
};

// Returns the last N glucose readings in chronological order (for model input)
export const getRecentGlucoseReadings = async (
  patientId: number,
  count: number = 5,
): Promise<number[]> => {
  const records = await prisma.healthRecord.findMany({
    where: { patientId },
    orderBy: { recordedAt: "desc" },
    take: count,
    select: { bloodGlucose: true },
  });

  // Reverse so oldest reading is first (required for time-series models)
  return records.map((r) => r.bloodGlucose).reverse();
};
