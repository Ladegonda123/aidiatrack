import { Router } from "express";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth.validator";
import { authenticate } from "../middleware/auth.middleware";
import { authRateLimit } from "../middleware/rateLimit.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  requestPasswordReset,
  verifyOtpAndReset,
} from "../controllers/auth.controller";

const router = Router();

router.post("/register", authRateLimit, validate(registerSchema), register);
router.post("/login", authRateLimit, validate(loginSchema), login);
router.get("/me", authenticate, getMe);
router.put(
  "/profile",
  authenticate,
  validate(updateProfileSchema),
  updateProfile,
);
router.put(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  changePassword,
);
router.post(
  "/forgot-password",
  authRateLimit,
  validate(forgotPasswordSchema),
  requestPasswordReset,
);
router.post(
  "/reset-password",
  authRateLimit,
  validate(resetPasswordSchema),
  verifyOtpAndReset,
);

export default router;
