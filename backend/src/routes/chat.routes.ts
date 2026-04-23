import { Router } from "express";
import {
  getMessages,
  sendMessage,
  getUserPresence,
  markMessagesRead,
  getUnreadCount,
} from "../controllers/chat.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/messages/:doctorId", authenticate, getMessages);
router.get("/presence/:userId", authenticate, getUserPresence);
router.get("/unread-count", authenticate, getUnreadCount);
router.post("/send", authenticate, sendMessage);
router.post("/:otherUserId/read", authenticate, markMessagesRead);

export default router;
