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

export interface DoctorListItem {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  photoUrl?: string | null;
  createdAt?: string;
}

export interface AssignedPatient {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  photoUrl?: string | null;
  role: "PATIENT";
  dateOfBirth?: string;
  gender?: string;
  doctorId?: number | null;
  fcmToken?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const getMyPatients = async (): Promise<User[]> => {
  const response =
    await axiosInstance.get<ApiResponse<User[] | { patients: User[] }>>(
      "/doctor/patients",
    );
  const data = response.data?.data;
  return Array.isArray(data) ? data : (data?.patients ?? []);
};

export const getPatientDetail = async (
  id: number,
): Promise<PatientDetailResponse> => {
  const response = await axiosInstance.get<ApiResponse<PatientDetailResponse>>(
    `/doctor/patient/${id}`,
  );
  return response.data.data;
};

export const assignPatient = async (
  patientEmail: string,
): Promise<AssignedPatient> => {
  const response = await axiosInstance.post<ApiResponse<AssignedPatient>>(
    "/admin/assign-patient",
    { patientEmail },
  );
  return response.data.data;
};

export const getUnassignedPatients = async (): Promise<User[]> => {
  const response = await axiosInstance.get<ApiResponse<User[]>>(
    "/admin/unassigned-patients",
  );
  return response.data.data;
};

export const listDoctors = async (): Promise<DoctorListItem[]> => {
  const response =
    await axiosInstance.get<ApiResponse<DoctorListItem[]>>("/doctor/list");
  return response.data.data ?? [];
};

export const assignDoctor = async (doctorId: number): Promise<User> => {
  const response = await axiosInstance.post<ApiResponse<User>>(
    "/doctor/assign",
    { doctorId },
  );
  return response.data.data;
};
