import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../config/database";
import * as aiService from "../services/ai.service";
import { HealthRecordInput } from "../types";
import { logger } from "../utils/logger";
import { sendError, sendSuccess } from "../utils/response";

export const predictGlucoseLevel = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const patientId = req.user!.userId;
    const body = req.body as HealthRecordInput;

    if (typeof body.bloodGlucose !== "number") {
      sendError(res, 400, "bloodGlucose is required");
      return;
    }

    const previousRecords = await prisma.healthRecord.findMany({
      where: { patientId },
      orderBy: { recordedAt: "desc" },
      take: 4,
      select: { bloodGlucose: true },
    });

    const bgReadings = previousRecords
      .reverse()
      .map((record) => record.bloodGlucose);

    const activityMap: Record<string, number> = {
      NONE: 0,
      LOW: 1,
      MODERATE: 2,
      HIGH: 3,
    };

    const prediction = await aiService.predictGlucose({
      bgReadings,
      currentBg: body.bloodGlucose,
      mealGi: 55,
      mealCalories: body.calories ?? 450,
      activityEncoded: activityMap[body.activityLevel ?? "NONE"] ?? 0,
      insulinDose: body.insulinDose ?? 0,
      hourOfDay: new Date().getHours(),
      minutesSinceMeal: 30,
    });

    sendSuccess(
      res,
      {
        prediction,
        predictionAvailable: prediction !== null,
      },
      200,
      "Prediction completed",
    );
  } catch (error: unknown) {
    logger.error("predictGlucoseLevel failed", error);
    sendError(res, 500, "Failed to generate prediction");
  }
};

export const getPredictionHistory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const patientId = req.user!.userId;

    const predictions = await prisma.prediction.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    sendSuccess(res, { predictions }, 200, "Prediction history retrieved");
  } catch (error: unknown) {
    logger.error("getPredictionHistory failed", error);
    sendError(res, 500, "Failed to retrieve prediction history");
  }
};

export const getRiskAssessment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const patientId = req.user!.userId;
    const patientProfile = await prisma.user.findUnique({
      where: { id: patientId },
      select: {
        dateOfBirth: true,
        gender: true,
      },
    });

    if (!patientProfile) {
      sendError(res, 404, "Patient not found");
      return;
    }

    const features = await aiService.buildRiskFeatures(
      patientId,
      patientProfile,
    );

    if (!features) {
      sendError(
        res,
        400,
        "Not enough data for risk assessment. Log at least one reading first.",
      );
      return;
    }

    const prediction = await aiService.assessRisk(features);

    if (!prediction) {
      sendError(res, 503, "Risk assessment temporarily unavailable");
      return;
    }

    await prisma.prediction.create({
      data: {
        patientId,
        riskLevel: prediction.riskLevel,
        riskFactors: prediction.riskFactors as Prisma.InputJsonValue,
        confidence: prediction.confidence,
        modelVersion: "1.0.0-stub",
      },
    });

    sendSuccess(
      res,
      {
        riskLevel: prediction.riskLevel,
        riskFactors: prediction.riskFactors,
        confidence: prediction.confidence,
      },
      200,
      "Risk assessment completed",
    );
  } catch (error: unknown) {
    logger.error("getRiskAssessment failed", error);
    sendError(res, 500, "Failed to assess risk");
  }
};

export const assessRisk = getRiskAssessment;
