import { Request, Response } from "express";
import prisma from "../config/database";
import { sendSuccess, sendError } from "../utils/response";
import logger from "../utils/logger";

export interface CreateNotificationInput {
  userId: number;
  type: "medication" | "bg_alert" | "chat" | "system";
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const createNotification = async (
  input: CreateNotificationInput,
): Promise<void> => {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data ?? {},
      },
    });
  } catch (error: unknown) {
    logger.error("createNotification failed", error);
  }
};

export const getNotifications = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = notifications.filter(
      (notification) => !notification.isRead,
    ).length;

    sendSuccess(res, { notifications, unreadCount });
  } catch (error: unknown) {
    logger.error("getNotifications failed", error);
    sendSuccess(res, { notifications: [], unreadCount: 0 });
  }
};

export const markOneRead = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const id = Number.parseInt(String(req.params.id), 10);

    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    sendSuccess(res, null, 200, "Marked as read");
  } catch (error: unknown) {
    logger.error("markOneRead failed", error);
    sendError(res, 500, "Failed to mark as read");
  }
};

export const markAllRead = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    sendSuccess(res, null, 200, "All marked as read");
  } catch (error: unknown) {
    logger.error("markAllRead failed", error);
    sendError(res, 500, "Failed to mark all as read");
  }
};

export const deleteOneNotification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const id = Number.parseInt(String(req.params.id), 10);

    await prisma.notification.deleteMany({
      where: { id, userId },
    });

    sendSuccess(res, null, 200, "Notification deleted");
  } catch (error: unknown) {
    logger.error("deleteOneNotification failed", error);
    sendError(res, 500, "Failed to delete notification");
  }
};

export const deleteAllNotifications = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    await prisma.notification.deleteMany({
      where: { userId },
    });

    sendSuccess(res, null, 200, "All notifications deleted");
  } catch (error: unknown) {
    logger.error("deleteAllNotifications failed", error);
    sendError(res, 500, "Failed to delete notifications");
  }
};
