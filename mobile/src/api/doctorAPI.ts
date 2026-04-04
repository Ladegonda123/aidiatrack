import axiosInstance from "./axiosInstance";
import { Medication, Prediction, User, HealthRecord } from "../types";

interface ApiResponse<T> {
  data: T;
}

type PatientDetailResponse = User & {
  healthRecords: HealthRecord[];
  predictions: Prediction[];
  medications: Medication[];
};

export const getMyPatients = async (): Promise<User[]> => {
  const response =
    await axiosInstance.get<ApiResponse<User[]>>("/doctor/patients");
  return response.data.data;
};

export const getPatientDetail = async (
  id: number,
): Promise<PatientDetailResponse> => {
  const response = await axiosInstance.get<ApiResponse<PatientDetailResponse>>(
    `/doctor/patient/${id}`,
  );
  return response.data.data;
};

export const assignPatient = async (email: string): Promise<User> => {
  const response = await axiosInstance.post<ApiResponse<User>>(
    "/admin/assign-patient",
    { email },
  );
  return response.data.data;
};

export const getUnassignedPatients = async (): Promise<User[]> => {
  const response = await axiosInstance.get<ApiResponse<User[]>>(
    "/admin/unassigned-patients",
  );
  return response.data.data;
};
