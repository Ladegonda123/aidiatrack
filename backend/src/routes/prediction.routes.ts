import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
  assessRisk,
  getPredictionHistory,
  predictGlucoseLevel,
} from "../controllers/prediction.controller";

const router = Router();

router.post(
  "/glucose",
  authenticate,
  requireRole("PATIENT"),
  predictGlucoseLevel,
);
router.get(
  "/history",
  authenticate,
  requireRole("PATIENT"),
  getPredictionHistory,
);
router.post("/risk", authenticate, requireRole("PATIENT"), assessRisk);

export default router;
