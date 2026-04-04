import axiosInstance from "./axiosInstance";
import { HealthRecord, HealthSummary, Prediction } from "../types";

interface ApiResponse<T> {
  data: T;
}

interface LogHealthResponse {
  record: HealthRecord;
  prediction: Prediction | null;
  predictionAvailable: boolean;
}

export const logHealthRecord = async (
  data: Partial<HealthRecord>,
): Promise<LogHealthResponse> => {
  const response = await axiosInstance.post<ApiResponse<LogHealthResponse>>(
    "/health-records/record",
    data,
  );
  return response.data.data;
};

export const getHealthHistory = async (
  page = 1,
  limit = 20,
): Promise<HealthRecord[]> => {
  const response = await axiosInstance.get<ApiResponse<HealthRecord[]>>(
    "/health-records/history",
    { params: { page, limit } },
  );
  return response.data.data;
};

export const getHealthSummary = async (): Promise<HealthSummary> => {
  const response = await axiosInstance.get<ApiResponse<HealthSummary>>(
    "/health-records/summary",
  );
  return response.data.data;
};
