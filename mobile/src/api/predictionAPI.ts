import axiosInstance from "./axiosInstance";
import { Prediction, RiskLevel } from "../types";

interface ApiResponse<T> {
  data: T;
}

interface RiskAssessment {
  riskLevel: RiskLevel;
  riskFactors: string[];
  confidence: number;
}

export const getPredictionHistory = async (page = 1): Promise<Prediction[]> => {
  const response = await axiosInstance.get<ApiResponse<Prediction[]>>(
    "/predictions/history",
    { params: { page } },
  );
  return response.data.data;
};

export const getRiskAssessment = async (): Promise<RiskAssessment> => {
  const response =
    await axiosInstance.post<ApiResponse<RiskAssessment>>("/predictions/risk");
  return response.data.data;
};
