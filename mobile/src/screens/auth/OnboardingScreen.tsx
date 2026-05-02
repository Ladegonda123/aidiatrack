import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../utils/colors";
import { useAuth } from "../../hooks/useAuth";
import { saveLanguage } from "../../utils/storage";
import { updateProfile } from "../../api/authAPI";
import { Language } from "../../types";
import i18n from "../../i18n";

const OnboardingScreen = (): React.JSX.Element => {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);
  const [gender, setGender] = useState<string>(user?.gender ?? "");
  const [dob, setDob] = useState<string>(
    user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : "",
  );
  const [phone, setPhone] = useState<string>(user?.phone ?? "");
  const [weight, setWeight] = useState<string>(
    typeof user?.weightKg === "number" ? String(user.weightKg) : "",
  );
  const [height, setHeight] = useState<string>(
    typeof user?.heightCm === "number" ? String(user.heightCm) : "",
  );
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(
    user?.language ?? "rw",
  );

  const bmi = useMemo(() => {
    const weightValue = Number(weight);
    const heightValue = Number(height);

    if (!weightValue || !heightValue) {
      return null;
    }

    if (weightValue <= 0 || heightValue <= 0) {
      return null;
    }

    return weightValue / (heightValue / 100) ** 2;
  }, [height, weight]);

  const bmiLabel = useMemo(() => {
    if (bmi === null) {
      return null;
    }

    if (bmi < 18.5) {
      return t("onboarding.bmiUnderweight");
    }

    if (bmi < 25) {
      return t("onboarding.bmiNormal");
    }

    if (bmi < 30) {
      return t("onboarding.bmiOverweight");
    }

    return t("onboarding.bmiObese");
  }, [bmi, t]);

  const handleNext = async (): Promise<void> => {
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
      return;
    }

    try {
      setSubmitting(true);
      await updateProfile({
        gender: gender || undefined,
        dateOfBirth: dob ? new Date(dob).toISOString() : undefined,
        phone: phone || undefined,
        weightKg: weight ? Number(weight) : undefined,
        heightCm: height ? Number(height) : undefined,
        language: selectedLanguage,
        isOnboardingComplete: true,
      });

      setUser((prev) =>
        prev
          ? {
              ...prev,
              gender: gender || prev.gender,
              dateOfBirth: dob ? new Date(dob).toISOString() : prev.dateOfBirth,
              phone: phone || prev.phone,
              weightKg: weight ? Number(weight) : prev.weightKg,
              heightCm: height ? Number(height) : prev.heightCm,
              language: selectedLanguage,
              isOnboardingComplete: true,
            }
          : prev,
      );

      await i18n.changeLanguage(selectedLanguage);
      await saveLanguage(selectedLanguage);
      setCompleted(true);
    } catch {
      Alert.alert(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async (): Promise<void> => {
    try {
      await updateProfile({ isOnboardingComplete: true });
      setUser((prev) =>
        prev ? { ...prev, isOnboardingComplete: true } : prev,
      );
      setCompleted(true);
    } catch {
      // silent skip failure
    }
  };

  const bmiText = bmi === null ? null : `${bmi.toFixed(1)} (${bmiLabel})`;

  if (completed) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.container}>
          <View style={styles.completionCard}>
            <View style={styles.completionIcon}>
              <Ionicons
                name="checkmark-circle"
                size={56}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.completionTitle}>
              {t("onboarding.welcome")}, {user?.fullName ?? t("common.appName")}
            </Text>
            <Text style={styles.completionSubtitle}>
              {t("onboarding.profileComplete")}
            </Text>
            <TouchableOpacity style={styles.nextBtn} onPress={() => undefined}>
              <Text style={styles.nextBtnText}>
                {t("onboarding.getStarted")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.progressBar}>
          {[1, 2, 3].map((step) => (
            <View
              key={step}
              style={[
                styles.progressStep,
                currentStep >= step && styles.progressStepActive,
              ]}
            />
          ))}
        </View>

        <Text style={styles.stepLabel}>
          {t("onboarding.step")} {currentStep} / 3
        </Text>

        <View style={styles.content}>
          {currentStep === 1 && (
            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>{t("onboarding.step1Title")}</Text>
              <Text style={styles.stepSubtitle}>
                {t("onboarding.step1Subtitle")}
              </Text>

              <Text style={styles.label}>{t("onboarding.genderLabel")}</Text>
              <View style={styles.pillRow}>
                {[
                  { value: "Male", label: t("auth.editProfile.genderMale") },
                  {
                    value: "Female",
                    label: t("auth.editProfile.genderFemale"),
                  },
                  { value: "Other", label: t("auth.editProfile.genderOther") },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.pill,
                      gender === option.value && styles.pillActive,
                    ]}
                    onPress={() => setGender(option.value)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        gender === option.value && styles.pillTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>{t("onboarding.dobLabel")}</Text>
              <TextInput
                style={styles.input}
                value={dob}
                onChangeText={setDob}
                placeholder={t("onboarding.dobPlaceholder")}
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="none"
              />

              <Text style={styles.label}>{t("onboarding.phoneLabel")}</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder={t("onboarding.phonePlaceholder")}
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="phone-pad"
              />
            </View>
          )}

          {currentStep === 2 && (
            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>{t("onboarding.step2Title")}</Text>
              <Text style={styles.stepSubtitle}>
                {t("onboarding.step2Subtitle")}
              </Text>

              <Text style={styles.label}>{t("onboarding.weightLabel")}</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder={t("onboarding.weightLabel")}
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric"
              />

              <Text style={styles.label}>{t("onboarding.heightLabel")}</Text>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                placeholder={t("onboarding.heightLabel")}
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric"
              />

              {bmiText ? (
                <View style={styles.bmiBox}>
                  <Text style={styles.bmiLabel}>
                    {t("onboarding.bmiPreview")}
                  </Text>
                  <Text style={styles.bmiValue}>{bmiText}</Text>
                </View>
              ) : null}
            </View>
          )}

          {currentStep === 3 && (
            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>{t("onboarding.step3Title")}</Text>
              <Text style={styles.stepSubtitle}>
                {t("onboarding.step3Subtitle")}
              </Text>

              <View style={styles.languageGrid}>
                {[
                  {
                    value: "rw" as Language,
                    label: t("profile.languageRw"),
                    flag: "🇷🇼",
                  },
                  {
                    value: "en" as Language,
                    label: t("profile.languageEn"),
                    flag: "🇬🇧",
                  },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.languageCard,
                      selectedLanguage === option.value &&
                        styles.languageCardActive,
                    ]}
                    onPress={() => setSelectedLanguage(option.value)}
                  >
                    <Text style={styles.languageFlag}>{option.flag}</Text>
                    <Text
                      style={[
                        styles.languageName,
                        selectedLanguage === option.value &&
                          styles.languageNameActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.buttonRow}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setCurrentStep((prev) => prev - 1)}
            >
              <Text style={styles.backBtnText}>{t("common.back")}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => {
              handleNext().catch(() => undefined);
            }}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.nextBtnText}>
                {currentStep === 3
                  ? t("onboarding.finish")
                  : t("onboarding.next")}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => {
            handleSkip().catch(() => undefined);
          }}
        >
          <Text style={styles.skipText}>{t("onboarding.skip")}</Text>
        </TouchableOpacity>
      </View>
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
    padding: 24,
  },
  progressBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  progressStepActive: {
    backgroundColor: COLORS.primary,
  },
  stepLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 32,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  stepCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  pillRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
  bmiBox: {
    marginTop: 6,
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.primary + "10",
    borderWidth: 1,
    borderColor: COLORS.primary + "20",
  },
  bmiLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bmiValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  languageGrid: {
    flexDirection: "row",
    gap: 12,
  },
  languageCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    gap: 8,
  },
  languageCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + "10",
  },
  languageFlag: {
    fontSize: 28,
  },
  languageName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  languageNameActive: {
    color: COLORS.primary,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  backBtnText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  nextBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  skipText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  completionCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 24,
  },
  completionIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary + "10",
    alignItems: "center",
    justifyContent: "center",
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
    lineHeight: 32,
  },
  completionSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});

export default OnboardingScreen;
