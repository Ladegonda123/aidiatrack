import cron from "node-cron";
import prisma from "../config/database";
import { createNotification } from "../controllers/notification.controller";
import { sendPushNotification } from "./notification.service";
import { logger } from "../utils/logger";

export const registerReminderCrons = (): void => {
  // Medication reminders are scheduled dynamically in addMedication.
  logger.info("[Cron] Medication reminders scheduled");

  cron.schedule(
    "* * * * *",
    async (): Promise<void> => {
      try {
        const now = new Date().toLocaleTimeString("en-GB", {
          timeZone: "Africa/Kigali",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
        const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

        const patients = await prisma.user.findMany({
          where: {
            role: "PATIENT",
            reminderEnabled: true,
            fcmToken: { not: null },
            reminderTimes: { has: now },
          },
          select: {
            id: true,
            fcmToken: true,
            language: true,
            reminderTimes: true,
            healthRecords: {
              where: {
                recordedAt: {
                  gte: startOfDay,
                  lte: endOfDay,
                },
              },
              select: { id: true },
              take: 1,
            },
          },
        });

        for (const patient of patients) {
          if (patient.healthRecords.length > 0 || !patient.fcmToken) {
            continue;
          }

          const lang = patient.language ?? "rw";
          const title =
            lang === "rw"
              ? "Kwibutsa Isuzuma ry'Ubuzima"
              : "Time to Log Your Reading";
          const body =
            lang === "rw"
              ? `Ni igihe cyo gufata isuzuma rya BG (${now}). Ntubyibagirwe!`
              : `It's ${now} - time to log your blood glucose reading.`;

          await sendPushNotification({
            userId: patient.id,
            title,
            body,
            channelId: "general",
            data: {
              type: "daily_logging_reminder",
              action: "log_reading",
              time: now,
            },
          });

          await createNotification({
            userId: patient.id,
            type: "system",
            title,
            body,
            data: { action: "log_reading", time: now },
          });

          logger.info(
            `[Cron] Sent logging reminder to patient ${patient.id} at ${now}`,
          );
        }
      } catch (error: unknown) {
        logger.error("[Cron] Daily logging reminder failed", error);
      }
    },
    { timezone: "Africa/Kigali" },
  );

  logger.info(
    "[Cron] Daily logging reminders scheduled (dynamic per patient times)",
  );
};
