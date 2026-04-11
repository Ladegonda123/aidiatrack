import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
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
router.post("/:id/read", authenticate, markOneRead);
router.delete("/all", authenticate, deleteAllNotifications);
router.delete("/:id", authenticate, deleteOneNotification);

export default router;
