import * as admin from "firebase-admin";
import prisma from "../config/database";
import { ENV } from "../config/env";
import logger from "../utils/logger";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: ENV.FIREBASE_PROJECT_ID,
      privateKey: ENV.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      clientEmail: ENV.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

interface PushNotificationPayload {
  userId: number;
  title: string;
  body: string;
  channelId?: "medication_reminders" | "bg_alerts" | "general";
  data?: Record<string, string>;
}

export const sendPushNotification = async (
  payload: PushNotificationPayload,
): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { fcmToken: true, fullName: true },
    });

    if (!user?.fcmToken) {
      logger.warn("No FCM token for user - skipping push", {
        userId: payload.userId,
      });
      return;
    }

    const message: admin.messaging.Message = {
      token: user.fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data ?? {},
      android: {
        priority: "high",
        notification: {
          channelId: payload.channelId ?? "general",
          sound: "default",
          priority: "max",
          defaultVibrateTimings: true,
        },
      },
    };

    const result = await admin.messaging().send(message);
    logger.success("Push notification sent", {
      userId: payload.userId,
      messageId: result,
    });
  } catch (error: unknown) {
    logger.error("Failed to send push notification", {
      userId: payload.userId,
      error,
    });
  }
};

export const saveDeviceToken = async (
  userId: number,
  fcmToken: string,
): Promise<void> => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });
    logger.info("FCM token saved", { userId });
  } catch (error: unknown) {
    logger.error("Failed to save FCM token", { userId, error });
  }
};

export const sendMedicationReminder = async (
  userId: number,
  drugName: string,
  dosage: string,
): Promise<void> => {
  await sendPushNotification({
    userId,
    title: "Medication Reminder",
    body: `Time to take ${drugName} ${dosage}`,
    channelId: "medication_reminders",
    data: { type: "medication_reminder", drugName },
  });
};

export const sendHighBgAlert = async (
  userId: number,
  bgValue: number,
): Promise<void> => {
  await sendPushNotification({
    userId,
    title: "High Blood Glucose Alert",
    body: `Your reading of ${bgValue} mg/dL is high. Please take action.`,
    channelId: "bg_alerts",
    data: { type: "bg_alert", bgValue: bgValue.toString() },
  });
};

export const sendChatNotification = async (
  receiverId: number,
  senderName: string,
  messagePreview: string,
): Promise<void> => {
  await sendPushNotification({
    userId: receiverId,
    title: `New message from ${senderName}`,
    body:
      messagePreview.length > 80
        ? `${messagePreview.substring(0, 80)}...`
        : messagePreview,
    channelId: "general",
    data: { type: "chat_message", senderName },
  });
};
