import { Request, Response } from "express";
import { prisma } from "../config/database";
import { sendSuccess, sendError } from "../utils/response";
import { logger } from "../utils/logger";

/**
 * Consolidated dietary advice based on blood glucose level
 * Supports English and Kinyarwanda
 */

export const getDietRecommendations = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.user!;

    // Get patient's last health record
    const lastRecord = await prisma.healthRecord.findFirst({
      where: { patientId: userId },
      orderBy: { recordedAt: "desc" },
      take: 1,
    });

    // If no records, return guidance to log readings first
    if (!lastRecord) {
      sendSuccess(res, {
        advice:
          req.user!.language === "rw"
            ? "Andika isuzuma rya mbere kugira ngo ubone inama isuso ku diyabete yawe."
            : "Log your first health reading to get personalized dietary advice.",
        foodsToEat: [],
        foodsToAvoid: [],
      });
      return;
    }

    const language = (req.user!.language as "en" | "rw") || "rw";
    const adviceText = getDietAdvice(lastRecord.bloodGlucose, language);

    // Determine foods to eat and avoid based on BG level
    let foodsToEat: string[] = [];
    let foodsToAvoid: string[] = [];

    if (lastRecord.bloodGlucose < 70) {
      foodsToEat =
        language === "rw"
          ? ["imineke", "imbuto", "ikinini"]
          : ["banana", "fruits", "sugary drinks"];
      foodsToAvoid =
        language === "rw"
          ? ["ubugali", "umuceli", "imboga n'udusomo"]
          : ["ugali", "white rice", "green vegetables only"];
    } else if (lastRecord.bloodGlucose <= 130) {
      foodsToEat =
        language === "rw"
          ? ["ibiharage", "imboga", "amagi", "ibijumba", "ubugari bw'ubwali"]
          : [
              "beans",
              "vegetables",
              "eggs",
              "sweet potato",
              "whole grain bread",
            ];
      foodsToAvoid =
        language === "rw"
          ? ["ubugali mu kivanyo kinini", "umuceli mwekundu"]
          : ["ugali in large portions", "white rice"];
    } else if (lastRecord.bloodGlucose <= 180) {
      foodsToEat =
        language === "rw"
          ? ["isombe", "ibiharage", "amagi", "inyama"]
          : ["cassava leaves", "beans", "eggs", "meat"];
      foodsToAvoid =
        language === "rw"
          ? ["ubugali", "umuceli mwekundu", "imineke", "imyumbati igatokowe"]
          : ["ugali", "white rice", "fried plantains", "fried cassava"];
    } else {
      foodsToEat =
        language === "rw"
          ? ["inyama", "amagi", "imboga zikaze", "isombe"]
          : ["meat", "eggs", "leafy vegetables", "cassava leaves"];
      foodsToAvoid =
        language === "rw"
          ? ["ubugali", "umuceli", "imineke", "ibiryo bitorokoye", "umutobe"]
          : ["ugali", "rice", "banana", "fried foods", "fruit juice"];
    }

    sendSuccess(res, {
      bloodGlucose: lastRecord.bloodGlucose,
      advice: adviceText,
      foodsToEat,
      foodsToAvoid,
      recordDate: lastRecord.recordedAt,
    });
  } catch (error) {
    logger.error("getDietRecommendations failed", error);
    sendError(res, 500, "Failed to fetch dietary recommendations");
  }
};

export const getDietAdvice = (
  bloodGlucose: number,
  language: "en" | "rw",
): string => {
  if (language === "rw") {
    return getDietAdviceKin(bloodGlucose);
  }
  return getDietAdviceEn(bloodGlucose);
};

const getDietAdviceEn = (bloodGlucose: number): string => {
  if (bloodGlucose < 70) {
    return "Your blood sugar is LOW. Eat fast-acting carbohydrates immediately: a ripe banana, fruit juice, or sugary drink. Then follow with a proper meal.";
  } else if (bloodGlucose <= 130) {
    return "Your blood sugar is in a good range. Continue with your balanced diet. Focus on beans (ibiharage), vegetables, eggs, and sweet potato. Avoid ugali and white rice in large portions.";
  } else if (bloodGlucose <= 180) {
    return "Your blood sugar is elevated. For your next meal: choose isombe, beans, or eggs. Avoid ugali, white rice, ripe bananas, and fried cassava. Drink water and take a short walk if possible.";
  } else {
    return "Your blood sugar is HIGH. Avoid all high-GI foods: ugali, white rice, ripe bananas, fried foods, and fruit juice. Eat protein (eggs, meat stew, beans) with green vegetables only. Contact your doctor if it stays this high.";
  }
};

const getDietAdviceKin = (bloodGlucose: number): string => {
  if (bloodGlucose < 70) {
    return "Isukiraguciro ryawe riri nshuro (low). Nyira vuba ibinyobwa bifite sukari: imineke izeze, umutobe, cyangwa ikinini kigira sukari. Noneho nyira iyo yanyu nziza.";
  } else if (bloodGlucose <= 130) {
    return "Isukiraguciro ryawe riri neza. Komeza kugira ibiryo bikwiye. Gumira ibiharage, imboga, amagi, n'ibijumba. Witikira ubugali n'umuceli mwekundu mu kivanyo kinini.";
  } else if (bloodGlucose <= 180) {
    return "Isukiraguciro ryawe riri hejuru. Kuri iyo yanyu iregeye: hitamo isombe, ibiharage, cyangwa amagi. Witikira ubugali, umuceli mwekundu, imineke izeze, n'imyumbati igatokowe. Nywa amazi kandi genda inzira yoroshye niba ibishoboka.";
  } else {
    return "Isukiraguciro ryawe riri hejuru cyane. Witikira ibinyobwa bic yujuje sukari: ubugali, umuceli mwekundu, imineke izeze, ibiryo bitorokoye, n'umutobe. Nyira inyama (amagi, inyama y'intamu itogwa), n'imboga zikaze gusa. Baza umuganga waho niba isukiraguciro ihagarara aho.";
  }
};
