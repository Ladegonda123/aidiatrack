// import { Router, Request, Response } from "express";
// import { authenticate } from "../middleware/auth.middleware";
// import { requireRole } from "../middleware/role.middleware";

// const router = Router();

// // POST /api/admin/assign-patient
// // Doctor assigns a patient to themselves by the patient's email
// router.post(
//   "/assign-patient",
//   authenticate,
//   requireRole("DOCTOR"),
//   (req: Request, res: Response) => {
//     // Phase 2 will call a real controller here:
//     // await prisma.user.update({
//     //   where: { email: req.body.patientEmail },
//     //   data: { doctorId: req.user.userId }
//     // })
//     res.json({
//       success: true,
//       message: "Assign patient to doctor — Phase 2",
//       received: req.body, // { patientEmail: "marie@example.com" }
//     });
//   },
// );

// // GET /api/admin/unassigned-patients
// // Lists patients not yet assigned to any doctor
// router.get(
//   "/unassigned-patients",
//   authenticate,
//   requireRole("DOCTOR"),
//   (_req: Request, res: Response) => {
//     res.json({
//       success: true,
//       message: "Get unassigned patients — Phase 2",
//       patients: [],
//     });
//   },
// );

// export default router;
