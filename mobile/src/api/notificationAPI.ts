import axiosInstance from "./axiosInstance";

export interface AppNotification {
  id: number;
  userId: number;
  type: "chat" | "medication" | "bg_alert" | "system";
  title: string;
  body: string;
  isRead: boolean;
  data?: Record<string, string>;
  createdAt: string;
}

export const getNotifications = async (): Promise<{
  notifications: AppNotification[];
  unreadCount: number;
}> => {
  const response = await axiosInstance.get("/notifications");
  return response.data?.data ?? { notifications: [], unreadCount: 0 };
};

export const markOneRead = async (id: number): Promise<void> => {
  await axiosInstance.post(`/notifications/${id}/read`);
};

export const markAllRead = async (): Promise<void> => {
  await axiosInstance.post("/notifications/read-all");
};

export const deleteNotification = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/notifications/${id}`);
};

export const deleteAllNotifications = async (): Promise<void> => {
  await axiosInstance.delete("/notifications/all");
};
