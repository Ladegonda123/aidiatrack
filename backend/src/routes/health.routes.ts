import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import { healthRecordSchema } from "../validators/health.validator";
import {
  getHealthHistory,
  getHealthSummary,
  logHealthRecord,
} from "../controllers/health.controller";

const router = Router();

router.post(
  "/record",
  authenticate,
  requireRole("PATIENT"),
  validate(healthRecordSchema),
  logHealthRecord,
);
router.get("/history", authenticate, requireRole("PATIENT"), getHealthHistory);
router.get("/summary", authenticate, requireRole("PATIENT"), getHealthSummary);

export default router;
