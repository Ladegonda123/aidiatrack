import axiosInstance from "./axiosInstance";
import { Medication } from "../types";

interface ApiResponse<T> {
  data: T;
}

interface AddMedicationData {
  drugName: string;
  dosage: string;
  frequency: string;
  reminderTimes: string[];
}

export const getMyMedications = async (): Promise<Medication[]> => {
  const response = await axiosInstance.get("/medications/list");
  const data = response.data?.data;
  return Array.isArray(data) ? data : (data?.medications ?? []);
};

export const addMedication = async (
  data: AddMedicationData,
): Promise<Medication> => {
  const response = await axiosInstance.post<ApiResponse<Medication>>(
    "/medications/schedule",
    data,
  );
  const medication = response.data.data ?? null;
  if (!medication) {
    throw new Error("Missing medication response data");
  }
  return medication;
};

export const deleteMedication = async (id: number): Promise<void> => {
  await axiosInstance.delete<ApiResponse<null>>(`/medications/${id}`);
};
