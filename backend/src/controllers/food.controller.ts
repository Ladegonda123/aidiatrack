import { Prisma, FoodItem } from "@prisma/client";
import { Request, Response } from "express";
import prisma from "../config/database";
import { logger } from "../utils/logger";
import { sendError, sendSuccess } from "../utils/response";

interface FoodSearchQuery {
  search?: string;
  lang?: "en" | "rw";
  category?: string;
  giMax?: string;
}

interface FoodWithGiCategory extends FoodItem {
  displayName: string;
  giCategory: "none" | "low" | "medium" | "high";
}

const getGiCategory = (
  glycemicIndex: number,
): "none" | "low" | "medium" | "high" => {
  if (glycemicIndex === 0) {
    return "none";
  }
  if (glycemicIndex <= 55) {
    return "low";
  }
  if (glycemicIndex <= 69) {
    return "medium";
  }
  return "high";
};

export const searchFoods = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      search,
      lang = "rw",
      category,
      giMax,
    } = req.query as FoodSearchQuery;

    const trimmedSearch = typeof search === "string" ? search.trim() : "";
    if (trimmedSearch.length === 1) {
      sendError(res, 400, "Search must be at least 2 characters");
      return;
    }

    const where: Prisma.FoodItemWhereInput = {};

    if (typeof category === "string" && category.trim().length > 0) {
      where.category = category.trim();
    }

    if (typeof giMax === "string" && giMax.trim().length > 0) {
      const parsedGiMax = Number.parseInt(giMax, 10);
      if (Number.isNaN(parsedGiMax)) {
        sendError(res, 400, "giMax must be a number");
        return;
      }
      where.glycemicIndex = { lte: parsedGiMax };
    }

    if (trimmedSearch.length >= 2) {
      where.OR = [
        {
          name: {
            contains: trimmedSearch,
            mode: "insensitive" as const,
          },
        },
        {
          nameKin: {
            contains: trimmedSearch,
            mode: "insensitive" as const,
          },
        },
      ];
    }

    const query = trimmedSearch.length >= 2 ? trimmedSearch : "";
    const foods = await prisma.foodItem.findMany({
      where: query
        ? {
            OR: [
              {
                name: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
              {
                nameKin: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : undefined,
      take: 20,
      orderBy: { name: "asc" },
    });

    const foodsWithCategory: FoodWithGiCategory[] = foods.map((food) => ({
      ...food,
      displayName: lang === "rw" && food.nameKin ? food.nameKin : food.name,
      giCategory: getGiCategory(food.glycemicIndex),
    }));

    sendSuccess(res, { foods: foodsWithCategory });
  } catch (error: unknown) {
    logger.error("searchFoods failed", error);
    sendError(res, 500, "Failed to fetch foods");
  }
};
