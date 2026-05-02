import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  assignPatientSchema,
  unassignPatientSchema,
} from "../validators/admin.validator";
import {
  assignPatient,
  getMyPatientByEmail,
  getUnassignedPatients,
  searchPatients,
  unassignPatient,
} from "../controllers/admin.controller";

const router = Router();

router.post(
  "/assign-patient",
  authenticate,
  requireRole("DOCTOR"),
  validate(assignPatientSchema),
  assignPatient,
);
router.post(
  "/unassign-patient",
  authenticate,
  requireRole("DOCTOR"),
  validate(unassignPatientSchema),
  unassignPatient,
);
router.get(
  "/unassigned-patients",
  authenticate,
  requireRole("DOCTOR"),
  getUnassignedPatients,
);
router.get(
  "/search-patients",
  authenticate,
  requireRole("DOCTOR"),
  searchPatients,
);
router.get(
  "/patients/search",
  authenticate,
  requireRole("DOCTOR"),
  getMyPatientByEmail,
);

export default router;
