import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { searchFoods } from "../api/foodAPI";
import { FoodItem } from "../types";
import { COLORS } from "../utils/colors";

interface SelectedMeal {
  mealGi: number;
  mealCalories: number;
  mealDesc: string;
}

interface Props {
  onSelect: (meal: SelectedMeal) => void;
  selectedDesc?: string;
  language: string;
}

interface QuickSelectOption {
  labelKey:
    | "logHealth.mealGiHigh"
    | "logHealth.mealGiMedium"
    | "logHealth.mealGiLow"
    | "logHealth.mealSkipped";
  gi: number;
  cal: number;
  color: string;
}

const QUICK_SELECT: QuickSelectOption[] = [
  { labelKey: "logHealth.mealGiHigh", gi: 75, cal: 600, color: COLORS.danger },
  {
    labelKey: "logHealth.mealGiMedium",
    gi: 55,
    cal: 450,
    color: COLORS.warning,
  },
  { labelKey: "logHealth.mealGiLow", gi: 30, cal: 300, color: COLORS.success },
  {
    labelKey: "logHealth.mealSkipped",
    gi: 0,
    cal: 0,
    color: COLORS.textSecondary,
  },
];

const GI_COLORS: Record<FoodItem["giCategory"], string> = {
  low: COLORS.success,
  medium: COLORS.warning,
  high: COLORS.danger,
  none: COLORS.textSecondary,
};

const FoodPicker: React.FC<Props> = ({ onSelect, selectedDesc, language }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);

  const handleSearch = useCallback(
    async (text: string): Promise<void> => {
      setQuery(text);

      if (text.trim().length < 2) {
        setResults([]);
        setShowResults(false);
        return;
      }

      try {
        setSearching(true);
        const foods = await searchFoods(text, language === "en" ? "en" : "rw");
        setResults(foods);
        setShowResults(true);
      } catch {
        setResults([]);
        setShowResults(false);
      } finally {
        setSearching(false);
      }
    },
    [language],
  );

  const handleFoodSelect = useCallback(
    (food: FoodItem): void => {
      const displayName =
        language === "rw" && food.nameKin
          ? food.nameKin
          : (food.displayName ?? food.name);

      onSelect({
        mealGi: food.glycemicIndex,
        mealCalories: food.caloriesPer100g,
        mealDesc: displayName,
      });
      setQuery("");
      setResults([]);
      setShowResults(false);
    },
    [language, onSelect],
  );

  const handleQuickSelect = useCallback(
    (option: QuickSelectOption): void => {
      onSelect({
        mealGi: option.gi,
        mealCalories: option.cal,
        mealDesc: t(option.labelKey),
      });
      setQuery("");
      setResults([]);
      setShowResults(false);
    },
    [onSelect, t],
  );

  const getFoodName = (food: FoodItem): string =>
    language === "rw" && food.nameKin
      ? food.nameKin
      : (food.displayName ?? food.name);

  return (
    <View>
      <View style={styles.searchContainer}>
        <Ionicons
          name={"search-outline" as keyof typeof Ionicons.glyphMap}
          size={18}
          color={COLORS.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={t("logHealth.mealSearch")}
          placeholderTextColor={COLORS.textSecondary}
          value={query}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searching ? (
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
            style={styles.searchLoader}
          />
        ) : null}
        {query.length > 0 && !searching ? (
          <TouchableOpacity
            onPress={() => {
              setQuery("");
              setResults([]);
              setShowResults(false);
            }}
            accessibilityRole="button"
          >
            <Ionicons
              name={"close-circle" as keyof typeof Ionicons.glyphMap}
              size={18}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {showResults && results.length > 0 ? (
        <View style={styles.resultsContainer}>
          <FlatList
            data={results.slice(0, 6)}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleFoodSelect(item)}
                activeOpacity={0.7}
              >
                <View style={styles.resultLeft}>
                  <Text style={styles.resultName}>{getFoodName(item)}</Text>
                  <Text style={styles.resultCategory}>
                    {t(`foods.categories.${item.category}`, {
                      defaultValue: item.category,
                    })}
                  </Text>
                </View>
                <View style={styles.resultRight}>
                  <View
                    style={[
                      styles.giTag,
                      { backgroundColor: `${GI_COLORS[item.giCategory]}20` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.giTagText,
                        { color: GI_COLORS[item.giCategory] },
                      ]}
                    >
                      {t(`foods.gi.${item.giCategory}`)}
                    </Text>
                  </View>
                  <Text style={styles.calText}>
                    {item.caloriesPer100g} {t("foods.caloriesUnit")}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => (
              <View style={styles.resultSeparator} />
            )}
          />
        </View>
      ) : null}

      {selectedDesc && !showResults ? (
        <View style={styles.selectedMeal}>
          <Ionicons
            name={"checkmark-circle" as keyof typeof Ionicons.glyphMap}
            size={16}
            color={COLORS.success}
          />
          <Text style={styles.selectedText} numberOfLines={1}>
            {selectedDesc}
          </Text>
        </View>
      ) : null}

      <View style={styles.quickRow}>
        {QUICK_SELECT.map((option) => (
          <TouchableOpacity
            key={option.labelKey}
            style={[styles.quickButton, { borderColor: option.color }]}
            onPress={() => handleQuickSelect(option)}
            activeOpacity={0.7}
          >
            <Text style={[styles.quickText, { color: option.color }]}>
              {t(option.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    padding: 0,
  },
  searchLoader: {
    marginLeft: 4,
  },
  resultsContainer: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginTop: 4,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  resultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resultLeft: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  resultCategory: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
    textTransform: "capitalize",
  },
  resultRight: {
    alignItems: "flex-end",
    gap: 3,
  },
  giTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  giTagText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  calText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  resultSeparator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 14,
  },
  selectedMeal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  selectedText: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: "500",
    flex: 1,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  quickButton: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

export default FoodPicker;
