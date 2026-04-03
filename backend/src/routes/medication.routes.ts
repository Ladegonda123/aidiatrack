import { Router } from "express";
import {
  addMedication,
  deleteMedication,
  getMyMedications,
} from "../controllers/medication.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.use(authenticate, requireRole("PATIENT"));

router.post("/schedule", addMedication);
router.get("/list", getMyMedications);
router.delete("/:id", deleteMedication);

export default router;
