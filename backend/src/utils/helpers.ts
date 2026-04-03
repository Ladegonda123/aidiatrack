export type GlucoseLabel = "LOW" | "NORMAL" | "PREDIABETIC" | "HIGH";

export interface PaginationResult {
  page: number;
  limit: number;
  skip: number;
}

export const getChatRoomId = (userIdA: number, userIdB: number): string => {
  const lowerId = Math.min(userIdA, userIdB);
  const higherId = Math.max(userIdA, userIdB);
  return `chat_${lowerId}_${higherId}`;
};

export const calculateBmi = (
  weightKg: number,
  heightCm: number,
): number | null => {
  if (weightKg <= 0 || heightCm <= 0) {
    return null;
  }

  const heightMeters = heightCm / 100;
  const bmi = weightKg / (heightMeters * heightMeters);
  return Number(bmi.toFixed(2));
};

export const glucoseLabel = (glucoseMgDl: number): GlucoseLabel => {
  if (glucoseMgDl < 70) {
    return "LOW";
  }

  if (glucoseMgDl < 140) {
    return "NORMAL";
  }

  if (glucoseMgDl < 200) {
    return "PREDIABETIC";
  }

  return "HIGH";
};

export const paginate = (
  page: number = 1,
  limit: number = 20,
  maxLimit: number = 100,
): PaginationResult => {
  const normalizedPage =
    Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const normalizedLimit =
    Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20;
  const boundedLimit = Math.min(normalizedLimit, maxLimit);

  return {
    page: normalizedPage,
    limit: boundedLimit,
    skip: (normalizedPage - 1) * boundedLimit,
  };
};

export const stripUndefined = <T extends Record<string, unknown>>(
  input: T,
): Partial<T> => {
  const cleanedEntries = Object.entries(input).filter(
    ([, value]) => value !== undefined,
  );
  return Object.fromEntries(cleanedEntries) as Partial<T>;
};
