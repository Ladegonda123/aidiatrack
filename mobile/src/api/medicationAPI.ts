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
  const response =
    await axiosInstance.get<ApiResponse<Medication[]>>("/medications/list");
  return response.data.data;
};

export const addMedication = async (
  data: AddMedicationData,
): Promise<Medication> => {
  const response = await axiosInstance.post<ApiResponse<Medication>>(
    "/medications/schedule",
    data,
  );
  return response.data.data;
};

export const deleteMedication = async (id: number): Promise<void> => {
  await axiosInstance.delete<ApiResponse<null>>(`/medications/${id}`);
};
