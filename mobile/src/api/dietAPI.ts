import axiosInstance from "./axiosInstance";

export interface DietRecommendation {
  advice: string;
  adviceRw?: string;
  foodsToEat: string[];
  foodsToAvoid: string[];
  level: "low" | "normal" | "high" | "very_high";
}

export const getDietRecommendations =
  async (): Promise<DietRecommendation | null> => {
    try {
      const response = await axiosInstance.get("/diet/recommendations");
      return response.data?.data ?? null;
    } catch {
      return null;
    }
  };
