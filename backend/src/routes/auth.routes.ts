import { Router } from "express";
import { registerSchema, loginSchema } from "../validators/auth.validator";
import { authenticate } from "../middleware/auth.middleware";
import { authRateLimit } from "../middleware/rateLimit.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  register,
  login,
  getMe,
  updateProfile,
} from "../controllers/auth.controller";

const router = Router();

router.post("/register", authRateLimit, validate(registerSchema), register);
router.post("/login", authRateLimit, validate(loginSchema), login);
router.get("/me", authenticate, getMe);
router.put("/profile", authenticate, updateProfile);

export default router;
