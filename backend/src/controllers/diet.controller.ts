import { Request, Response } from "express";
import prisma from "../config/database";
import { sendSuccess } from "../utils/response";
import logger from "../utils/logger";

type DietAdvice = {
  level: "low" | "normal" | "high" | "very_high";
  advice: string;
  adviceRw: string;
  foodsToEat: string[];
  foodsToAvoid: string[];
};

const getDietAdvice = (avgBg: number, language: string): DietAdvice => {
  if (avgBg < 70) {
    return {
      level: "low",
      advice:
        language === "rw"
          ? "Isuzuma rya BG ryawe riri hasi cyane. Fata ibyo kurya biganisha isukiraguciro vuba."
          : "Your blood glucose is too low. Eat fast-acting carbohydrates immediately.",
      adviceRw: "Isuzuma rya BG ryawe riri hasi cyane.",
      foodsToEat:
        language === "rw"
          ? ["Juice y'inzabibu", "Amashaza", "Ubukombo", "Umwero"]
          : ["Fruit juice", "Glucose tablets", "Honey", "Sugar"],
      foodsToAvoid:
        language === "rw"
          ? ["Indyo zirimo intete nyinshi", "Alkohol"]
          : ["High fiber foods", "Alcohol"],
    };
  }

  if (avgBg <= 140) {
    return {
      level: "normal",
      advice:
        language === "rw"
          ? "Isuzuma rya BG ryawe riri mu rwego busanzwe. Komeza kugenzura neza indyo yawe."
          : "Your blood glucose is in the normal range. Keep maintaining your diet.",
      adviceRw: "BG ryawe riri mu rwego busanzwe.",
      foodsToEat:
        language === "rw"
          ? ["Ibiharage", "Isombe", "Imboga", "Inyama nziza", "Amashaza"]
          : ["Beans", "Cassava leaves", "Vegetables", "Lean meat", "Lentils"],
      foodsToAvoid:
        language === "rw"
          ? ["Soda", "Ibikoresho bya sukari", "Ugali nyinshi"]
          : ["Soda", "Sugary foods", "Excess ugali"],
    };
  }

  if (avgBg <= 200) {
    return {
      level: "high",
      advice:
        language === "rw"
          ? "Isuzuma rya BG ryawe riri hejuru. Gabanya ibyo kurya bya GI nkuru kandi ongera imyitozo ngororamubiri."
          : "Your blood glucose is elevated. Reduce high GI foods and increase physical activity.",
      adviceRw: "BG ryawe riri hejuru. Gabanya indyo ya GI nkuru.",
      foodsToEat:
        language === "rw"
          ? ["Ibiharage", "Amashaza", "Imboga zitoshye", "Inzuzi", "Isombe"]
          : [
              "Beans",
              "Lentils",
              "Green vegetables",
              "Avocado",
              "Cassava leaves",
            ],
      foodsToAvoid:
        language === "rw"
          ? [
              "Ugali",
              "Ibikomangoma",
              "Juice",
              "Ibikoresho bya sukari",
              "Rizine ryera",
            ]
          : ["Ugali", "White bread", "Juice", "Sugary snacks", "White rice"],
    };
  }

  return {
    level: "very_high",
    advice:
      language === "rw"
        ? "Isuzuma rya BG ryawe riri hejuru cyane. Buka umuganga wawe vuba kandi reka ibyo kurya bya sukari."
        : "Your blood glucose is very high. See your doctor urgently and avoid all sugary foods.",
    adviceRw: "BG ryawe riri hejuru cyane. Buka umuganga vuba.",
    foodsToEat:
      language === "rw"
        ? ["Imboga zitoshye gusa", "Amazi menshi", "Inzuzi"]
        : ["Only green vegetables", "Water", "Avocado"],
    foodsToAvoid:
      language === "rw"
        ? [
            "Ibyo kurya byose bya sukari",
            "Ugali",
            "Rizine",
            "Ibikomangoma",
            "Juice",
            "Soda",
          ]
        : ["All sugary foods", "Ugali", "Rice", "Bread", "Juice", "Soda"],
  };
};

export const getDietRecommendations = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const language = req.user!.language ?? "rw";

    const records = await prisma.healthRecord.findMany({
      where: {
        patientId: userId,
        recordedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: { bloodGlucose: true },
      orderBy: { recordedAt: "desc" },
      take: 30,
    });

    if (records.length === 0) {
      sendSuccess(res, null, 200, "No records found");
      return;
    }

    const avgBg =
      records.reduce((sum, r) => sum + r.bloodGlucose, 0) / records.length;

    const advice = getDietAdvice(Math.round(avgBg), language);

    sendSuccess(res, {
      ...advice,
      avgBg: Math.round(avgBg),
      recordCount: records.length,
    });
  } catch (error: unknown) {
    logger.error("getDietRecommendations failed", error);
    sendSuccess(res, null);
  }
};
