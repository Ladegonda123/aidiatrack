import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getNotifications,
  markAllRead,
} from "../controllers/notification.controller";

const router = Router();

router.get("/", authenticate, getNotifications);
router.post("/read", authenticate, markAllRead);

export default router;
