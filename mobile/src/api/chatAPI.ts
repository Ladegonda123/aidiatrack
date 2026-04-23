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

interface UnreadCountPayload {
  unreadCount?: number;
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

export const markMessagesRead = async (otherUserId: number): Promise<void> => {
  await axiosInstance.post(`/chat/${otherUserId}/read`);
};

export const getUnreadCount = async (): Promise<number> => {
  const response =
    await axiosInstance.get<ApiResponse<UnreadCountPayload>>(
      "/chat/unread-count",
    );

  return response.data?.data?.unreadCount ?? 0;
};
