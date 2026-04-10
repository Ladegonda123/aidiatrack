import { Request, Response } from "express";
import prisma from "../config/database";
import { logger } from "../utils/logger";
import { sendError, sendSuccess } from "../utils/response";
import { paginate } from "../utils/helpers";

interface PatientQuery {
  page?: string;
  limit?: string;
}

interface AssignDoctorBody {
  doctorId: number;
}

const sanitizeUser = (user: {
  passwordHash: string;
  [key: string]: unknown;
}): Record<string, unknown> => {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
};

export const getMyPatients = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const doctorId = req.user!.userId;
    const patients = await prisma.user.findMany({
      where: { doctorId, role: "PATIENT" },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        phone: true,
        photoUrl: true,
        createdAt: true,
        healthRecords: {
          select: { recordedAt: true, bloodGlucose: true },
          orderBy: { recordedAt: "desc" },
          take: 1,
        },
        medications: {
          where: { isActive: true },
          select: { id: true },
        },
        predictions: {
          select: { id: true, riskLevel: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const enrichedPatients = patients.map((p) => ({
      ...p,
      lastHealthRecord: p.healthRecords[0] ?? null,
      activeMedicationCount: p.medications.length,
      lastPrediction: p.predictions[0] ?? null,
      healthRecords: undefined,
      medications: undefined,
      predictions: undefined,
    }));

    sendSuccess(
      res,
      { patients: enrichedPatients },
      200,
      "Patients retrieved successfully",
    );
  } catch (error: unknown) {
    logger.error("getMyPatients failed", error);
    sendError(res, 500, "Failed to retrieve patients");
  }
};

export const getPatientDetail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const doctorId = req.user!.userId;
    const patientId = Number.parseInt(String(req.params.id), 10);

    if (!Number.isFinite(patientId) || patientId <= 0) {
      sendError(res, 400, "Invalid patient ID");
      return;
    }

    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      include: {
        healthRecords: {
          orderBy: { recordedAt: "desc" },
          take: 20,
        },
        predictions: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        medications: {
          where: { isActive: true },
        },
      },
    });

    if (!patient) {
      sendError(res, 404, "Patient not found");
      return;
    }

    if (patient.doctorId !== doctorId) {
      sendError(res, 403, "You do not have permission to view this patient");
      return;
    }

    const safePatient = sanitizeUser(patient);
    sendSuccess(
      res,
      { patient: safePatient },
      200,
      "Patient details retrieved successfully",
    );
  } catch (error: unknown) {
    logger.error("getPatientDetail failed", error);
    sendError(res, 500, "Failed to retrieve patient details");
  }
};

export const getPatientPredictions = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const doctorId = req.user!.userId;
    const patientId = Number.parseInt(String(req.params.id), 10);
    const query = req.query as PatientQuery;

    if (!Number.isFinite(patientId) || patientId <= 0) {
      sendError(res, 400, "Invalid patient ID");
      return;
    }

    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      select: { doctorId: true },
    });

    if (!patient) {
      sendError(res, 404, "Patient not found");
      return;
    }

    if (patient.doctorId !== doctorId) {
      sendError(
        res,
        403,
        "You do not have permission to view this patient's data",
      );
      return;
    }

    const page = Number.parseInt(query.page ?? "1", 10);
    const limit = Number.parseInt(query.limit ?? "20", 10);
    const {
      page: currentPage,
      limit: currentLimit,
      skip,
    } = paginate(page, limit);

    const [predictions, totalRecords] = await Promise.all([
      prisma.prediction.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        skip,
        take: currentLimit,
      }),
      prisma.prediction.count({
        where: { patientId },
      }),
    ]);

    sendSuccess(
      res,
      {
        predictions,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          totalRecords,
          totalPages: Math.max(1, Math.ceil(totalRecords / currentLimit)),
        },
      },
      200,
      "Patient predictions retrieved successfully",
    );
  } catch (error: unknown) {
    logger.error("getPatientPredictions failed", error);
    sendError(res, 500, "Failed to retrieve patient predictions");
  }
};

export const listDoctors = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const doctors = await prisma.user.findMany({
      where: { role: "DOCTOR" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        photoUrl: true,
        createdAt: true,
      },
    });

    sendSuccess(res, { doctors }, 200, "Doctors retrieved successfully");
  } catch (error: unknown) {
    logger.error("listDoctors failed", error);
    sendError(res, 500, "Failed to retrieve doctors");
  }
};

export const assignDoctor = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const body = req.body as AssignDoctorBody;

    if (!body.doctorId || Number.isNaN(body.doctorId) || body.doctorId <= 0) {
      sendError(res, 400, "Valid doctorId is required");
      return;
    }

    const doctor = await prisma.user.findUnique({
      where: { id: body.doctorId },
      select: { role: true },
    });

    if (!doctor) {
      sendError(res, 404, "Doctor not found");
      return;
    }

    if (doctor.role !== "DOCTOR") {
      sendError(res, 400, "The selected user is not a doctor");
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { doctorId: body.doctorId },
    });

    sendSuccess(
      res,
      { user: sanitizeUser(updatedUser) },
      200,
      "Doctor assigned successfully",
    );
  } catch (error: unknown) {
    logger.error("assignDoctor failed", error);
    sendError(res, 500, "Failed to assign doctor");
  }
};
