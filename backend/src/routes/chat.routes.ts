import { Router } from "express";
import { getMessages, sendMessage } from "../controllers/chat.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/messages/:doctorId", authenticate, getMessages);
router.post("/send", authenticate, sendMessage);

export default router;
