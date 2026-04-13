import axiosInstance from "./axiosInstance";
import { Message } from "../types";

interface ApiResponse<T> {
  data: T;
}

interface MessagesPayload {
  messages?: Message[];
}

interface MessagePayload {
  message?: Message;
}

export const getMessages = async (doctorId: number): Promise<Message[]> => {
  const response = await axiosInstance.get<ApiResponse<MessagesPayload>>(
    `/chat/messages/${doctorId}`,
  );
  const payload = response.data.data;
  return Array.isArray(payload?.messages) ? payload.messages : [];
};

export const sendMessage = async (
  receiverId: number,
  content: string,
): Promise<Message> => {
  const response = await axiosInstance.post<ApiResponse<MessagePayload>>(
    "/chat/send",
    { receiverId, content },
  );
  const message = response.data.data?.message;

  if (!message) {
    throw new Error("Invalid send message response");
  }

  return message;
};
