import axiosInstance from "./axiosInstance";
import { DietRecommendation } from "../types";

interface ApiResponse<T> {
  data: T;
}

export const getDietRecommendations = async (): Promise<DietRecommendation> => {
  const response = await axiosInstance.get<ApiResponse<DietRecommendation>>(
    "/diet/recommendations",
  );
  return response.data.data;
};
