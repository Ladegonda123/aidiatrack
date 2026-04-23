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
  const response = await axiosInstance.get(`/predictions/history?page=${page}`);
  const data = response.data?.data;
  return Array.isArray(data) ? data : (data?.predictions ?? []);
};

export const getRiskAssessment = async (): Promise<RiskAssessment> => {
  const response =
    await axiosInstance.post<ApiResponse<RiskAssessment>>("/predictions/risk");
  return response.data.data;
};
