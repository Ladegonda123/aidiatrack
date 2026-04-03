import axiosInstance from "./axiosInstance";

export const updateFcmToken = async (fcmToken: string): Promise<void> => {
  await axiosInstance.put("/auth/profile", { fcmToken });
};
