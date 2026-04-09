import axiosInstance from "./axiosInstance";
import { Message } from "../types";

interface ApiResponse<T> {
  data: T;
}

export const getMessages = async (doctorId: number): Promise<Message[]> => {
  const response = await axiosInstance.get<ApiResponse<Message[]>>(
    `/chat/messages/${doctorId}`,
  );
  return response.data.data ?? [];
};

export const sendMessage = async (
  receiverId: number,
  content: string,
): Promise<Message> => {
  const response = await axiosInstance.post<ApiResponse<Message>>(
    "/chat/send",
    { receiverId, content },
  );
  return response.data.data;
};
