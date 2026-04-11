import * as admin from "firebase-admin";
import prisma from "../config/database";
import { ENV } from "../config/env";
import logger from "../utils/logger";
import { createNotification } from "../controllers/notification.controller";

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

const getNotificationText = (
  language: string,
  key: "medicationReminder" | "highBgAlert" | "chatMessage",
  params?: Record<string, string>,
): { title: string; body: string } => {
  const texts = {
    en: {
      medicationReminder: {
        title: "Medication Reminder",
        body: `Time to take ${params?.drug} ${params?.dosage}`,
      },
      highBgAlert: {
        title: "High Blood Glucose Alert",
        body: `Your reading of ${params?.value} mg/dL is high. Please take action.`,
      },
      chatMessage: {
        title: `New message from ${params?.name}`,
        body: params?.preview ?? "",
      },
    },
    rw: {
      medicationReminder: {
        title: "Urwibutso rw'imiti",
        body: `Ni igihe cyo gufata ${params?.drug} ${params?.dosage}`,
      },
      highBgAlert: {
        title: "Umuburo w’isukari nyinshi mu maraso",
        body: `Isuzuma ryawe rya ${params?.value} mg/dL riri hejuru. Fata ingamba vuba.`,
      },
      chatMessage: {
        title: `Ubutumwa bushya buva kwa ${params?.name}`,
        body: params?.preview ?? "",
      },
    },
  };
  return texts[language as "en" | "rw"]?.[key] ?? texts["en"][key];
};

export const sendMedicationReminder = async (
  userId: number,
  drugName: string,
  dosage: string,
): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { language: true },
    });
    const lang = user?.language ?? "rw";
    const { title, body } = getNotificationText(lang, "medicationReminder", {
      drug: drugName,
      dosage,
    });
    await sendPushNotification({
      userId,
      title,
      body,
      channelId: "medication_reminders",
      data: { type: "medication_reminder", drugName },
    });

    await createNotification({
      userId,
      type: "medication",
      title: lang === "rw" ? "Kwibutsa Umuti" : "Medication Reminder",
      body:
        lang === "rw"
          ? `Ni igihe cyo gufata ${drugName} ${dosage}`
          : `Time to take ${drugName} ${dosage}`,
      data: { drugName, dosage },
    });
  } catch (error: unknown) {
    logger.error("Failed to send medication reminder", { userId, error });
  }
};

export const sendHighBgAlert = async (
  userId: number,
  bgValue: number,
): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { language: true },
    });
    const lang = user?.language ?? "rw";
    const { title, body } = getNotificationText(lang, "highBgAlert", {
      value: bgValue.toString(),
    });
    await sendPushNotification({
      userId,
      title,
      body,
      channelId: "bg_alerts",
      data: { type: "bg_alert", bgValue: bgValue.toString() },
    });

    await createNotification({
      userId,
      type: "bg_alert",
      title:
        lang === "rw"
          ? "Isukiraguciro Riri Hejuru"
          : "High Blood Glucose Alert",
      body:
        lang === "rw"
          ? `Isuzuma ryawe rya ${bgValue} mg/dL riri hejuru. Fata ingamba vuba.`
          : `Your reading of ${bgValue} mg/dL is high. Please take action.`,
      data: { bgValue: bgValue.toString() },
    });
  } catch (error: unknown) {
    logger.error("Failed to send BG alert", { userId, error });
  }
};

export const sendChatNotification = async (
  receiverId: number,
  senderId: number,
  senderName: string,
  messagePreview: string,
): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { language: true },
    });
    const lang = user?.language ?? "rw";
    const preview =
      messagePreview.length > 80
        ? `${messagePreview.substring(0, 80)}...`
        : messagePreview;
    const { title, body } = getNotificationText(lang, "chatMessage", {
      name: senderName,
      preview,
    });
    await sendPushNotification({
      userId: receiverId,
      title,
      body,
      channelId: "general",
      data: { type: "chat_message", senderName },
    });

    await createNotification({
      userId: receiverId,
      type: "chat",
      title:
        lang === "rw"
          ? `Ubutumwa buva kwa ${senderName}`
          : `Message from ${senderName}`,
      body: preview,
      data: { senderName, senderId: senderId.toString() },
    });
  } catch (error: unknown) {
    logger.error("Failed to send chat notification", { receiverId, error });
  }
};
