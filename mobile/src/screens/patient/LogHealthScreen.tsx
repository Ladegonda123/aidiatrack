import React, { useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { z } from "zod";
import FoodPicker from "../../components/FoodPicker";
import { logHealthRecord } from "../../api/healthAPI";
import { PatientTabParamList, Prediction } from "../../types";
import { COLORS, getBgColor, getRiskColor } from "../../utils/colors";

type Props = BottomTabNavigationProp<PatientTabParamList, "LogHealth">;

const schema = z.object({
  bloodGlucose: z
    .string()
    .min(1, { message: "logHealth.validation.bloodGlucoseRequired" })
    .refine(
      (value) => {
        const parsed = Number(value);
        return !Number.isNaN(parsed) && parsed >= 20 && parsed <= 600;
      },
      {
        message: "logHealth.validation.bloodGlucoseRange",
      },
    ),
  weightKg: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value || value.trim().length === 0) {
          return true;
        }
        const parsed = Number(value);
        return !Number.isNaN(parsed) && parsed > 0;
      },
      {
        message: "logHealth.validation.weightPositive",
      },
    ),
  bloodPressure: z
    .string()
    .optional()
    .refine((value) => !value || /^\d{2,3}\/\d{2,3}$/.test(value), {
      message: "logHealth.validation.bloodPressureFormat",
    }),
  hba1c: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value || value.trim().length === 0) {
          return true;
        }
        const parsed = Number(value);
        return !Number.isNaN(parsed) && parsed >= 0 && parsed <= 20;
      },
      {
        message: "logHealth.validation.hba1cRange",
      },
    ),
  insulinDose: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value || value.trim().length === 0) {
          return true;
        }
        const parsed = Number(value);
        return !Number.isNaN(parsed) && parsed >= 0;
      },
      {
        message: "logHealth.validation.insulinNonNegative",
      },
    ),
  notes: z
    .string()
    .max(500, { message: "logHealth.validation.notesMax" })
    .optional(),
});

type FormData = z.infer<typeof schema>;

type SelectedMeal = {
  mealGi: number;
  mealCalories: number;
  mealDesc: string;
};

type ActivityLevelOption = "NONE" | "LOW" | "MODERATE" | "HIGH";

interface ActivityOption {
  value: ActivityLevelOption;
  labelKey:
    | "logHealth.activityNone"
    | "logHealth.activityLow"
    | "logHealth.activityModerate"
    | "logHealth.activityHigh";
  icon: keyof typeof Ionicons.glyphMap;
}

const ACTIVITY_OPTIONS: ActivityOption[] = [
  { value: "NONE", labelKey: "logHealth.activityNone", icon: "bed-outline" },
  { value: "LOW", labelKey: "logHealth.activityLow", icon: "walk-outline" },
  {
    value: "MODERATE",
    labelKey: "logHealth.activityModerate",
    icon: "bicycle-outline",
  },
  {
    value: "HIGH",
    labelKey: "logHealth.activityHigh",
    icon: "barbell-outline",
  },
];

const LogHealthScreen = (): React.JSX.Element => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<Props>();
  const bloodGlucoseRef = useRef<TextInput>(null);
  const [selectedMeals, setSelectedMeals] = useState<SelectedMeal[]>([]);
  const [activityLevel, setActivityLevel] =
    useState<ActivityLevelOption>("NONE");
  const [showPrediction, setShowPrediction] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [savedBg, setSavedBg] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleAddMeal = (meal: SelectedMeal): void => {
    setSelectedMeals((prev) => [...prev, meal]);
  };

  const handleRemoveMeal = (index: number): void => {
    setSelectedMeals((prev) => prev.filter((_, i) => i !== index));
  };

  // Weighted average GI and total calories from all selected foods
  const combinedMealData =
    selectedMeals.length === 0
      ? { mealGi: undefined, mealCalories: undefined, mealDesc: undefined }
      : {
          mealGi: Math.round(
            selectedMeals.reduce((sum, m) => sum + m.mealGi, 0) /
              selectedMeals.length,
          ),
          mealCalories: selectedMeals.reduce(
            (sum, m) => sum + m.mealCalories,
            0,
          ),
          mealDesc: selectedMeals.map((m) => m.mealDesc).join(", "),
        };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      bloodGlucose: "",
      weightKg: "",
      bloodPressure: "",
      hba1c: "",
      insulinDose: "",
      notes: "",
    },
  });

  const closePredictionModal = (): void => {
    setShowPrediction(false);
    navigation.navigate("Dashboard");
  };

  const onSubmit = async (data: FormData): Promise<void> => {
    try {
      setSubmitting(true);

      const bloodGlucose = Number(data.bloodGlucose);
      const result = await logHealthRecord({
        bloodGlucose,
        ...combinedMealData,
        weightKg:
          data.weightKg && data.weightKg.trim().length > 0
            ? Number(data.weightKg)
            : undefined,
        bloodPressure: data.bloodPressure?.trim() || undefined,
        hba1c:
          data.hba1c && data.hba1c.trim().length > 0
            ? Number(data.hba1c)
            : undefined,
        insulinDose:
          data.insulinDose && data.insulinDose.trim().length > 0
            ? Number(data.insulinDose)
            : undefined,
        notes: data.notes?.trim() || undefined,
        activityLevel: activityLevel,
      });

      setSavedBg(bloodGlucose);
      setPrediction(result.prediction ?? null);
      setShowPrediction(true);
    } catch {
      Alert.alert(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const lang = i18n.language === "en" ? "en" : "rw";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              navigation.navigate("Dashboard");
            }}
            accessibilityRole="button"
          >
            <Ionicons
              name={"arrow-back" as keyof typeof Ionicons.glyphMap}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("logHealth.title")}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAwareScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          enableAutomaticScroll
          extraScrollHeight={20}
          extraHeight={120}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t("logHealth.bloodGlucose")}</Text>
            <Controller
              control={control}
              name="bloodGlucose"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  ref={bloodGlucoseRef}
                  style={[
                    styles.input,
                    errors.bloodGlucose ? styles.inputError : undefined,
                  ]}
                  placeholder={t("logHealth.bloodGlucosePlaceholder")}
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                  returnKeyType="next"
                />
              )}
            />
            <Text style={styles.hint}>{t("logHealth.bloodGlucoseHint")}</Text>
            {errors.bloodGlucose?.message ? (
              <Text style={styles.errorText}>
                {t(errors.bloodGlucose.message)}
              </Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t("logHealth.meal")}</Text>
            <FoodPicker
              selectedMeals={selectedMeals}
              onAdd={handleAddMeal}
              onRemove={handleRemoveMeal}
              language={lang}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t("logHealth.activity")}</Text>
            <View style={styles.activityRow}>
              {ACTIVITY_OPTIONS.map((option) => {
                const isActive = activityLevel === option.value;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.activityButton,
                      isActive ? styles.activityButtonActive : undefined,
                    ]}
                    onPress={() => setActivityLevel(option.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={isActive ? "#FFFFFF" : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.activityLabel,
                        isActive ? styles.activityLabelActive : undefined,
                      ]}
                    >
                      {t(option.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Text style={styles.sectionHeader}>
            {t("logHealth.optionalSection")}
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t("logHealth.weight")}</Text>
            <Controller
              control={control}
              name="weightKg"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    errors.weightKg ? styles.inputError : undefined,
                  ]}
                  placeholder={t("logHealth.weightHint")}
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric"
                  value={value ?? ""}
                  onChangeText={onChange}
                  returnKeyType="next"
                />
              )}
            />
            <Text style={styles.hint}>{t("logHealth.weightHint")}</Text>
            {errors.weightKg?.message ? (
              <Text style={styles.errorText}>{t(errors.weightKg.message)}</Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t("logHealth.bloodPressure")}</Text>
            <Controller
              control={control}
              name="bloodPressure"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    errors.bloodPressure ? styles.inputError : undefined,
                  ]}
                  placeholder={t("logHealth.bloodPressurePlaceholder")}
                  placeholderTextColor={COLORS.textSecondary}
                  value={value ?? ""}
                  onChangeText={onChange}
                  returnKeyType="next"
                />
              )}
            />
            <Text style={styles.hint}>{t("logHealth.bloodPressureHint")}</Text>
            {errors.bloodPressure?.message ? (
              <Text style={styles.errorText}>
                {t(errors.bloodPressure.message)}
              </Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t("logHealth.hba1c")}</Text>
            <Controller
              control={control}
              name="hba1c"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    errors.hba1c ? styles.inputError : undefined,
                  ]}
                  placeholder={t("logHealth.hba1cPlaceholder")}
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric"
                  value={value ?? ""}
                  onChangeText={onChange}
                  returnKeyType="next"
                />
              )}
            />
            <Text style={styles.hint}>{t("logHealth.hba1cHint")}</Text>
            {errors.hba1c?.message ? (
              <Text style={styles.errorText}>{t(errors.hba1c.message)}</Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t("logHealth.insulin")}</Text>
            <Controller
              control={control}
              name="insulinDose"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    errors.insulinDose ? styles.inputError : undefined,
                  ]}
                  placeholder="0"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric"
                  value={value ?? ""}
                  onChangeText={onChange}
                  returnKeyType="next"
                />
              )}
            />
            <Text style={styles.hint}>{t("logHealth.insulinHint")}</Text>
            {errors.insulinDose?.message ? (
              <Text style={styles.errorText}>
                {t(errors.insulinDose.message)}
              </Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t("logHealth.notes")}</Text>
            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder={t("logHealth.notesPlaceholder")}
                  placeholderTextColor={COLORS.textSecondary}
                  value={value ?? ""}
                  onChangeText={onChange}
                  multiline
                  numberOfLines={3}
                  returnKeyType="done"
                />
              )}
            />
            {errors.notes?.message ? (
              <Text style={styles.errorText}>{t(errors.notes.message)}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting ? styles.submitButtonDisabled : undefined,
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name={"save-outline" as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.submitText}>{t("logHealth.save")}</Text>
              </>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </View>

      <Modal
        visible={showPrediction}
        animationType="slide"
        transparent
        onRequestClose={closePredictionModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("logHealth.successTitle")}</Text>

            <View style={styles.modalBgRow}>
              <Text style={styles.modalBgLabel}>
                {t("logHealth.bloodGlucose").replace(" *", "")}
              </Text>
              <Text
                style={[styles.modalBgValue, { color: getBgColor(savedBg) }]}
              >
                {savedBg} {t("dashboard.mgdlUnit")}
              </Text>
            </View>

            {prediction ? (
              <View
                style={[
                  styles.predictionBox,
                  {
                    borderColor: `${getRiskColor(prediction.riskLevel)}40`,
                    backgroundColor: `${getRiskColor(prediction.riskLevel)}10`,
                  },
                ]}
              >
                <Ionicons
                  name={"analytics-outline" as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color={getRiskColor(prediction.riskLevel)}
                />
                <View style={styles.predictionContent}>
                  <Text style={styles.predictionLabel}>
                    {t("logHealth.predictionMessage", {
                      value:
                        prediction.predictedGlucose !== undefined &&
                        prediction.predictedGlucose !== null
                          ? prediction.predictedGlucose.toFixed(1)
                          : "--",
                    })}
                  </Text>
                  <View
                    style={[
                      styles.riskBadge,
                      { backgroundColor: getRiskColor(prediction.riskLevel) },
                    ]}
                  >
                    <Text style={styles.riskBadgeText}>
                      {prediction.riskLevel === "LOW"
                        ? t("logHealth.riskLow")
                        : prediction.riskLevel === "MEDIUM"
                          ? t("logHealth.riskMedium")
                          : t("logHealth.riskHigh")}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={styles.noPrediction}>{t("predictions.noData")}</Text>
            )}

            <TouchableOpacity
              style={styles.modalButton}
              onPress={closePredictionModal}
              activeOpacity={0.85}
            >
              <Text style={styles.modalButtonText}>{t("common.ok")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerSpacer: {
    width: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  hint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontStyle: "italic",
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 16,
    marginTop: 4,
  },
  activityRow: {
    flexDirection: "row",
    gap: 8,
  },
  activityButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    gap: 4,
  },
  activityButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  activityLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: "600",
    textAlign: "center",
  },
  activityLabelActive: {
    color: "#FFFFFF",
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 20,
  },
  modalBgRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalBgLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  modalBgValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  predictionBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  predictionContent: {
    flex: 1,
    gap: 8,
  },
  predictionLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "500",
    lineHeight: 20,
  },
  riskBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  riskBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  noPrediction: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 20,
    fontStyle: "italic",
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default LogHealthScreen;
