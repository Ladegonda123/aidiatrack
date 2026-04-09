import axiosInstance from "./axiosInstance";

export interface AppNotification {
  id: string;
  userId: number;
  type: "chat" | "medication" | "bg_alert" | "system";
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

interface ApiResponse<T> {
  data: T;
}

export const getNotifications = async (): Promise<{
  notifications: AppNotification[];
  unreadCount: number;
}> => {
  const response = await axiosInstance.get<
    ApiResponse<{
      notifications: AppNotification[];
      unreadCount: number;
    }>
  >("/notifications");

  return response.data?.data ?? { notifications: [], unreadCount: 0 };
};

export const markAllRead = async (): Promise<void> => {
  await axiosInstance.post("/notifications/read");
};
