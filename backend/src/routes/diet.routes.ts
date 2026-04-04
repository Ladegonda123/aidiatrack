import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import * as controller from "../controllers/diet.controller";

const router = Router();

// Patient only: Get personalized dietary recommendations
router.get(
  "/recommendations",
  authenticate,
  requireRole("PATIENT"),
  controller.getDietRecommendations,
);

export default router;
