import { Request, Response } from "express";
import prisma from "../config/database";
import { predictGlucose } from "../services/ai.service";
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

		const prediction = await predictGlucose({ patientId, ...body });

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

export const assessRisk = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const patientId = req.user!.userId;
		const latestPrediction = await prisma.prediction.findFirst({
			where: { patientId },
			orderBy: { createdAt: "desc" },
			select: {
				riskLevel: true,
				riskFactors: true,
			},
		});

		if (!latestPrediction) {
			sendError(res, 404, "No prediction found to assess risk");
			return;
		}

		sendSuccess(
			res,
			{
				riskLevel: latestPrediction.riskLevel,
				factors: latestPrediction.riskFactors,
			},
			200,
			"Risk assessment completed",
		);
	} catch (error: unknown) {
		logger.error("assessRisk failed", error);
		sendError(res, 500, "Failed to assess risk");
	}
};
