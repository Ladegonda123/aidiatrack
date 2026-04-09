import { Request, Response } from "express";
import prisma from "../config/database";
import { sendSuccess } from "../utils/response";
import logger from "../utils/logger";

// In-memory notification store per user (resets on server restart)
// For production this would be a DB table — sufficient for final year project
const notificationStore = new Map<number, AppNotification[]>();

export interface AppNotification {
  id: string;
  userId: number;
  type: "chat" | "medication" | "bg_alert" | "system";
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export const addNotification = (notification: AppNotification): void => {
  const existing = notificationStore.get(notification.userId) ?? [];
  // Keep max 50 notifications per user
  const updated = [notification, ...existing].slice(0, 50);
  notificationStore.set(notification.userId, updated);
};

export const getNotifications = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const notifications = notificationStore.get(userId) ?? [];
    const unreadCount = notifications.filter(
      (notification) => !notification.isRead,
    ).length;

    void prisma;

    sendSuccess(res, { notifications, unreadCount });
  } catch (error: unknown) {
    logger.error("getNotifications failed", error);
    sendSuccess(res, { notifications: [], unreadCount: 0 });
  }
};

export const markAllRead = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const notifications = notificationStore.get(userId) ?? [];
    const updated = notifications.map((notification) => ({
      ...notification,
      isRead: true,
    }));

    notificationStore.set(userId, updated);
    sendSuccess(res, { notifications: updated, unreadCount: 0 });
  } catch (error: unknown) {
    logger.error("markAllRead failed", error);
    sendSuccess(res, { notifications: [], unreadCount: 0 });
  }
};
