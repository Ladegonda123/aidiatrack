import { Request, Response, Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { sendSuccess } from "../utils/response";
import { sendDailyLoggingReminders } from "../services/notification.service";
import {
  getNotifications,
  markOneRead,
  markAllRead,
  deleteOneNotification,
  deleteAllNotifications,
} from "../controllers/notification.controller";

const router = Router();

router.get("/", authenticate, getNotifications);
router.post("/read-all", authenticate, markAllRead);
// Remove before production: demo route to trigger reminders instantly.
router.post(
  "/test-daily-reminder",
  authenticate,
  async (_req: Request, res: Response) => {
    await sendDailyLoggingReminders();
    sendSuccess(res, null, 200, "Reminders sent");
  },
);
router.post("/:id/read", authenticate, markOneRead);
router.delete("/all", authenticate, deleteAllNotifications);
router.delete("/:id", authenticate, deleteOneNotification);

export default router;
