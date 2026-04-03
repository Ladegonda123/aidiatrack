import { Request, Response } from "express";
import cron from "node-cron";
import prisma from "../config/database";
import { sendMedicationReminder } from "../services/notification.service";
import { logger } from "../utils/logger";
import { sendError, sendSuccess } from "../utils/response";

interface AddMedicationBody {
  drugName?: string;
  dosage?: string;
  frequency?: string;
  reminderTimes?: unknown;
  prescribedBy?: number;
}

const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const parseReminderTimes = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const times = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim());

  return Array.from(new Set(times));
};

const isValidReminderTime = (time: string): boolean => {
  return TIME_24H_REGEX.test(time);
};

export const addMedication = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const patientId = req.user!.userId;
    const body = req.body as AddMedicationBody;
    const drugName = body.drugName?.trim();
    const dosage = body.dosage?.trim();
    const frequency = body.frequency?.trim();
    const reminderTimes = parseReminderTimes(body.reminderTimes);

    if (!drugName || !dosage || !frequency || reminderTimes.length === 0) {
      sendError(
        res,
        400,
        "drugName, dosage, frequency and reminderTimes are required",
      );
      return;
    }

    const invalidTimes = reminderTimes.filter(
      (time) => !isValidReminderTime(time),
    );
    if (invalidTimes.length > 0) {
      sendError(res, 400, "All reminderTimes must be in HH:mm 24-hour format", {
        invalidTimes,
      });
      return;
    }

    const medication = await prisma.medication.create({
      data: {
        patientId,
        drugName,
        dosage,
        frequency,
        reminderTimes,
        prescribedBy: body.prescribedBy,
      },
    });

    reminderTimes.forEach((time: string) => {
      const [hour, minute] = time.split(":");
      cron.schedule(
        `${minute} ${hour} * * *`,
        async (): Promise<void> => {
          logger.info("Medication reminder triggered", {
            medicationId: medication.id,
            patientId: medication.patientId,
            time,
          });
          await sendMedicationReminder(
            medication.patientId,
            medication.drugName,
            medication.dosage,
          );
        },
        { timezone: "Africa/Kigali" },
      );
    });

    sendSuccess(res, { medication }, 201, "Medication scheduled successfully");
  } catch (error: unknown) {
    logger.error("addMedication failed", error);
    sendError(res, 500, "Failed to schedule medication");
  }
};

export const getMyMedications = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const patientId = req.user!.userId;

    const medications = await prisma.medication.findMany({
      where: {
        patientId,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    sendSuccess(
      res,
      { medications },
      200,
      "Active medications retrieved successfully",
    );
  } catch (error: unknown) {
    logger.error("getMyMedications failed", error);
    sendError(res, 500, "Failed to fetch medications");
  }
};

export const deleteMedication = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const patientId = req.user!.userId;
    const medicationId = Number.parseInt(String(req.params.id), 10);

    if (!Number.isFinite(medicationId) || medicationId <= 0) {
      sendError(res, 400, "Invalid medication ID");
      return;
    }

    const medication = await prisma.medication.findUnique({
      where: { id: medicationId },
    });

    if (!medication) {
      sendError(res, 404, "Medication not found");
      return;
    }

    if (medication.patientId !== patientId) {
      sendError(
        res,
        403,
        "You do not have permission to delete this medication",
      );
      return;
    }

    const updatedMedication = await prisma.medication.update({
      where: { id: medicationId },
      data: { isActive: false },
    });

    sendSuccess(
      res,
      { medication: updatedMedication },
      200,
      "Medication removed successfully",
    );
  } catch (error: unknown) {
    logger.error("deleteMedication failed", error);
    sendError(res, 500, "Failed to delete medication");
  }
};
