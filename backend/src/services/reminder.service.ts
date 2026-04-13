import cron from "node-cron";
import { sendDailyLoggingReminders } from "./notification.service";
import { logger } from "../utils/logger";

export const registerReminderCrons = (): void => {
  // Medication reminders are scheduled dynamically in addMedication.
  logger.info("[Cron] Medication reminders scheduled");

  cron.schedule(
    "0 7 * * *",
    async (): Promise<void> => {
      logger.info("[Cron] 07:00 — morning logging reminder");
      await sendDailyLoggingReminders();
    },
    { timezone: "Africa/Kigali" },
  );

  cron.schedule(
    "0 13 * * *",
    async (): Promise<void> => {
      logger.info("[Cron] 13:00 — midday logging reminder");
      await sendDailyLoggingReminders();
    },
    { timezone: "Africa/Kigali" },
  );

  cron.schedule(
    "0 20 * * *",
    async (): Promise<void> => {
      logger.info("[Cron] 20:00 — evening logging reminder");
      await sendDailyLoggingReminders();
    },
    { timezone: "Africa/Kigali" },
  );

  logger.info("[Cron] Daily logging reminders scheduled (07:00, 13:00, 20:00)");
};
