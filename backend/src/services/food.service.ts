import foodData from "../data/rwandan_foods.json";

export interface RwandanFood {
  id: string;
  name: string;
  category: string;
  serving_size_g: number;
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  glycemic_index: number;
  glycemic_load: number;
  diabetes_rating: "excellent" | "good" | "moderate" | "avoid";
  notes: string;
}

export const getAllFoods = (): RwandanFood[] => foodData.foods as RwandanFood[];

export const getDiabeticFriendlyFoods = (): RwandanFood[] =>
  foodData.foods.filter(
    (f) => f.diabetes_rating === "excellent" || f.diabetes_rating === "good",
  ) as RwandanFood[];

export const getFoodsToAvoid = (currentBG: number): RwandanFood[] => {
  if (currentBG > 150) {
    return foodData.foods.filter(
      (f) => f.diabetes_rating === "avoid" || f.diabetes_rating === "moderate",
    ) as RwandanFood[];
  }
  return foodData.foods.filter(
    (f) => f.diabetes_rating === "avoid",
  ) as RwandanFood[];
};

export const searchFoods = (query: string): RwandanFood[] => {
  const lower = query.toLowerCase();
  return foodData.foods.filter((f) =>
    f.name.toLowerCase().includes(lower),
  ) as RwandanFood[];
};

// Returns plain-text dietary advice based on current blood glucose
export const getDietRecommendationText = (bloodGlucose: number): string => {
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
