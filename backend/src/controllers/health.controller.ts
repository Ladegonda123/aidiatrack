import { Request, Response } from "express";
import prisma from "../config/database";
import { calculateBmi, paginate } from "../utils/helpers";
import { logger } from "../utils/logger";
import { sendError, sendSuccess } from "../utils/response";
import * as aiService from "../services/ai.service";
import { sendHighBgAlert } from "../services/notification.service";
import { ActivityLevel, HealthRecordInput } from "../types";
import xss from "xss";

interface HealthHistoryQuery {
  page?: string;
  limit?: string;
}

interface HealthSummaryTrendItem {
  date: string;
  value: number;
}

interface HealthSummaryResponse {
  averageBg: number | null;
  lastReading: {
    recordedAt: Date;
    bloodGlucose: number;
  } | null;
  totalRecords: number;
  trend: HealthSummaryTrendItem[];
}

const normalizeActivityLevel = (value: unknown): ActivityLevel => {
  if (
    value === "NONE" ||
    value === "LOW" ||
    value === "MODERATE" ||
    value === "HIGH"
  ) {
    return value;
  }

  return "NONE";
};

export const logHealthRecord = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const body = req.body as HealthRecordInput;
    const safeMealDesc =
      typeof body.mealDesc === "string" ? xss(body.mealDesc.trim()) : undefined;
    const safeBloodPressure =
      typeof body.bloodPressure === "string"
        ? xss(body.bloodPressure.trim())
        : undefined;
    const safeNotes =
      typeof body.notes === "string" ? xss(body.notes.trim()) : undefined;

    const record = await prisma.healthRecord.create({
      data: {
        patientId: userId,
        bloodGlucose: body.bloodGlucose,
        weightKg: body.weightKg,
        bmi:
          body.weightKg && body.heightCm
            ? calculateBmi(body.weightKg, body.heightCm)
            : undefined,
        bloodPressure: safeBloodPressure,
        mealDesc: safeMealDesc,
        calories: body.calories,
        activityLevel: normalizeActivityLevel(body.activityLevel),
        insulinDose: body.insulinDose,
        hba1c: body.hba1c,
        notes: safeNotes,
      },
    });

    const features = await aiService.buildGlucoseFeatures(userId, {
      id: record.id,
      bloodGlucose: record.bloodGlucose,
      mealGi: record.mealGi,
      mealCalories: record.mealCalories,
      activityLevel: record.activityLevel,
      insulinDose: record.insulinDose,
      recordedAt: record.recordedAt,
    });

    const prediction = await aiService.predictGlucose(features);

    if (prediction) {
      try {
        await prisma.prediction.create({
          data: {
            patientId: userId,
            healthRecordId: record.id,
            predictedGlucose: prediction.predictedGlucose,
            predictionHours: prediction.predictionHours,
            riskLevel: prediction.riskLevel,
            confidence: prediction.confidence,
            modelVersion: "1.0.0-stub",
          },
        });
      } catch (error: unknown) {
        logger.warn("Failed to save glucose prediction", error);
      }
    }

    if (record.bloodGlucose > 200) {
      try {
        await sendHighBgAlert(userId, record.bloodGlucose).catch(
          () => undefined,
        );
      } catch (error: unknown) {
        logger.warn("sendHighBgAlert failed", error);
      }
    }

    sendSuccess(
      res,
      {
        record,
        prediction,
        predictionAvailable: prediction !== null,
      },
      201,
      "Health record saved",
    );
  } catch (error: unknown) {
    logger.error("logHealthRecord failed", error);
    sendError(res, 500, "Failed to save health record");
  }
};

export const getHealthHistory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const query = req.query as HealthHistoryQuery;
    const page = Number.parseInt(query.page ?? "1", 10);
    const limit = Number.parseInt(query.limit ?? "20", 10);
    const {
      page: currentPage,
      limit: currentLimit,
      skip,
    } = paginate(page, limit);

    const [records, totalRecords] = await Promise.all([
      prisma.healthRecord.findMany({
        where: { patientId: userId },
        orderBy: { recordedAt: "desc" },
        skip,
        take: currentLimit,
      }),
      prisma.healthRecord.count({
        where: { patientId: userId },
      }),
    ]);

    sendSuccess(
      res,
      {
        records,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          totalRecords,
          totalPages: Math.max(1, Math.ceil(totalRecords / currentLimit)),
        },
      },
      200,
      "Health history fetched successfully",
    );
  } catch (error: unknown) {
    logger.error("getHealthHistory failed", error);
    sendError(res, 500, "Failed to fetch health history");
  }
};

export const getHealthSummary = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const [recordsLast30Days, totalRecords, recentReading, trendRecordsDesc] =
      await Promise.all([
        prisma.healthRecord.findMany({
          where: {
            patientId: userId,
            recordedAt: { gte: thirtyDaysAgo },
          },
          orderBy: { recordedAt: "desc" },
        }),
        prisma.healthRecord.count({
          where: { patientId: userId },
        }),
        prisma.healthRecord.findFirst({
          where: { patientId: userId },
          orderBy: { recordedAt: "desc" },
          select: {
            recordedAt: true,
            bloodGlucose: true,
          },
        }),
        prisma.healthRecord.findMany({
          where: {
            patientId: userId,
          },
          orderBy: { recordedAt: "desc" },
          take: 7,
          select: {
            recordedAt: true,
            bloodGlucose: true,
          },
        }),
      ]);

    const trendRecords = [...trendRecordsDesc].reverse();

    const averageBg =
      recordsLast30Days.length > 0
        ? recordsLast30Days.reduce(
            (sum, record) => sum + record.bloodGlucose,
            0,
          ) / recordsLast30Days.length
        : null;

    const summary: HealthSummaryResponse = {
      averageBg: averageBg !== null ? Number(averageBg.toFixed(2)) : null,
      lastReading: recentReading,
      totalRecords,
      trend: trendRecords.map((record) => ({
        date: record.recordedAt.toISOString(),
        value: record.bloodGlucose,
      })),
    };

    sendSuccess(res, summary, 200, "Health summary fetched successfully");
  } catch (error: unknown) {
    logger.error("getHealthSummary failed", error);
    sendError(res, 500, "Failed to fetch health summary");
  }
};
