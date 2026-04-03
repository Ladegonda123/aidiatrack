import { Request, Response } from "express";
import prisma from "../config/database";
import { logger } from "../utils/logger";
import { sendError, sendSuccess } from "../utils/response";

interface AssignPatientBody {
  patientEmail: string;
}

interface UnassignPatientBody {
  patientId: number;
}

interface PatientSearchQuery {
  email?: string;
}

const patientSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  createdAt: true,
} as const;

const assignedPatientSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  dateOfBirth: true,
  gender: true,
  doctorId: true,
  fcmToken: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const assignPatient = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const doctorId = req.user!.userId;
    const body = req.body as AssignPatientBody;

    const patient = await prisma.user.findFirst({
      where: {
        email: body.patientEmail,
        role: "PATIENT",
      },
      select: {
        id: true,
        doctorId: true,
      },
    });

    if (!patient) {
      sendError(res, 404, "No patient found with this email");
      return;
    }

    if (patient.doctorId !== null && patient.doctorId !== doctorId) {
      sendError(res, 409, "This patient is already assigned to another doctor");
      return;
    }

    if (patient.doctorId === doctorId) {
      sendError(res, 400, "This patient is already assigned to you");
      return;
    }

    const updatedPatient = await prisma.user.update({
      where: {
        id: patient.id,
      },
      data: {
        doctorId,
      },
      select: assignedPatientSelect,
    });

    sendSuccess(
      res,
      { patient: updatedPatient },
      200,
      "Patient assigned successfully",
    );
  } catch (error: unknown) {
    logger.error("assignPatient failed", error);
    sendError(res, 500, "Failed to assign patient");
  }
};

export const unassignPatient = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const doctorId = req.user!.userId;
    const body = req.body as UnassignPatientBody;

    const patient = await prisma.user.findUnique({
      where: {
        id: body.patientId,
      },
      select: {
        id: true,
        doctorId: true,
        role: true,
      },
    });

    if (!patient || patient.role !== "PATIENT") {
      sendError(res, 404, "Patient not found");
      return;
    }

    if (patient.doctorId !== doctorId) {
      sendError(
        res,
        403,
        "You do not have permission to unassign this patient",
      );
      return;
    }

    await prisma.user.update({
      where: {
        id: body.patientId,
      },
      data: {
        doctorId: null,
      },
    });

    sendSuccess(res, null, 200, "Patient unassigned successfully");
  } catch (error: unknown) {
    logger.error("unassignPatient failed", error);
    sendError(res, 500, "Failed to unassign patient");
  }
};

export const getUnassignedPatients = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const patients = await prisma.user.findMany({
      where: {
        role: "PATIENT",
        doctorId: null,
      },
      select: patientSelect,
      orderBy: {
        createdAt: "desc",
      },
    });

    sendSuccess(
      res,
      { patients },
      200,
      "Unassigned patients retrieved successfully",
    );
  } catch (error: unknown) {
    logger.error("getUnassignedPatients failed", error);
    sendError(res, 500, "Failed to retrieve unassigned patients");
  }
};

export const getMyPatientByEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const doctorId = req.user!.userId;
    const query = req.query as PatientSearchQuery;
    const searchTerm =
      typeof query.email === "string" ? query.email.trim() : "";

    if (searchTerm.length === 0) {
      sendError(res, 400, "Email query parameter is required");
      return;
    }

    const patients = await prisma.user.findMany({
      where: {
        role: "PATIENT",
        doctorId,
        OR: [
          {
            email: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            fullName: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        ],
      },
      select: patientSelect,
      orderBy: {
        createdAt: "desc",
      },
    });

    sendSuccess(res, { patients }, 200, "Patients retrieved successfully");
  } catch (error: unknown) {
    logger.error("getMyPatientByEmail failed", error);
    sendError(res, 500, "Failed to search patients");
  }
};
