import axiosInstance from "./axiosInstance";
import {
  Medication,
  Prediction,
  User,
  HealthRecord,
  PatientWithChat,
} from "../types";

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

export interface PatientSearchResult {
  id: number;
  fullName: string;
  email: string;
  photoUrl?: string | null;
  doctorId?: number | null;
  doctor?: {
    fullName: string;
  } | null;
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

export const getMyPatients = async (): Promise<PatientWithChat[]> => {
  const response =
    await axiosInstance.get<
      ApiResponse<PatientWithChat[] | { patients: PatientWithChat[] }>
    >("/doctor/patients");
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

export const searchPatients = async (
  query: string,
): Promise<PatientSearchResult[]> => {
  const response = await axiosInstance.get<
    ApiResponse<{ patients: PatientSearchResult[] }>
  >(`/admin/search-patients?query=${encodeURIComponent(query)}`);

  return response.data.data?.patients ?? [];
};
