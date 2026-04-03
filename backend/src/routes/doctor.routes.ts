import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
  getMyPatients,
  getPatientDetail,
  getPatientPredictions,
  listDoctors,
  assignDoctor,
} from "../controllers/doctor.controller";

const router = Router();

// Doctor routes: authenticated + DOCTOR role
router.get("/patients", authenticate, requireRole("DOCTOR"), getMyPatients);
router.get(
  "/patient/:id",
  authenticate,
  requireRole("DOCTOR"),
  getPatientDetail,
);
router.get(
  "/patient/:id/predictions",
  authenticate,
  requireRole("DOCTOR"),
  getPatientPredictions,
);

// Patient routes: authenticated + PATIENT role
router.get("/list", authenticate, requireRole("PATIENT"), listDoctors);
router.post("/assign", authenticate, requireRole("PATIENT"), assignDoctor);

export default router;
