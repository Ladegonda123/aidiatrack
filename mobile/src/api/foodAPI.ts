import axiosInstance from "./axiosInstance";
import { FoodItem, Language } from "../types";

interface ApiResponse<T> {
  data: T;
}

interface FoodsPayload {
  foods: FoodItem[];
}

export const searchFoods = async (
  query: string,
  lang: Language,
): Promise<FoodItem[]> => {
  const response = await axiosInstance.get<ApiResponse<FoodsPayload>>(
    "/foods",
    {
      params: { search: query, lang },
    },
  );
  return response.data.data.foods;
};

export const getFoodsByCategory = async (
  category: string,
): Promise<FoodItem[]> => {
  const response = await axiosInstance.get<ApiResponse<FoodItem[]>>("/foods", {
    params: { category },
  });
  return response.data.data;
};
