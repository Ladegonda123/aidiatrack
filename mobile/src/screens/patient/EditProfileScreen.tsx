import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DatePickerField from "../../components/DatePickerField";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { RootStackParamList } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { COLORS } from "../../utils/colors";
import { updateProfile } from "../../api/authAPI";

type Props = NativeStackScreenProps<RootStackParamList, "EditProfile">;

const editProfileSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

type EditProfileValues = z.infer<typeof editProfileSchema>;
type FormData = EditProfileValues;

const GENDER_OPTIONS = [
  { value: "Male", labelKey: "auth.editProfile.genderMale" },
  { value: "Female", labelKey: "auth.editProfile.genderFemale" },
  { value: "Other", labelKey: "auth.editProfile.genderOther" },
];

const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const lang = i18nInstance.language as "en" | "rw";
  const { user, setUser } = useAuth();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [gender, setGender] = useState<string>(user?.gender ?? "");

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: t("auth.editProfile.title"),
      headerStyle: {
        backgroundColor: COLORS.card,
      },
      headerTitleStyle: {
        fontSize: 17,
        fontWeight: "700",
        color: COLORS.textPrimary,
      },
      headerTintColor: COLORS.primary,
      headerShadowVisible: false,
      headerBackTitle: "",
    });
  }, [navigation, t]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      fullName: user?.fullName ?? "",
      phone: user?.phone ?? "",
      dateOfBirth: user?.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().split("T")[0]
        : "",
    },
  });

  useEffect(() => {
    reset({
      fullName: user?.fullName ?? "",
      phone: user?.phone ?? "",
      dateOfBirth: user?.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().split("T")[0]
        : "",
    });
    setGender(user?.gender ?? "");
  }, [user?.fullName, user?.phone, user?.gender, user?.dateOfBirth, reset]);

  const onSubmit = async (data: FormData): Promise<void> => {
    try {
      setSubmitting(true);

      const payload: Record<string, unknown> = {
        fullName: data.fullName,
      };

      if (data.phone?.trim()) {
        payload.phone = data.phone.trim();
      }

      if (gender) {
        payload.gender = gender;
      }

      if (data.dateOfBirth?.trim()) {
        const dateObj = new Date(data.dateOfBirth.trim());
        if (!isNaN(dateObj.getTime())) {
          payload.dateOfBirth = dateObj.toISOString();
        }
      }

      const updatedUser = await updateProfile(payload);

      if (updatedUser) {
        setUser((prev) => (prev ? { ...prev, ...updatedUser } : prev));
      } else {
        setUser((prev) => (prev ? { ...prev, ...payload } : prev));
      }

      Alert.alert(t("auth.editProfile.title"), t("auth.editProfile.success"), [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      const backendMessage =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { message?: unknown } } }).response
          ?.data?.message === "string"
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      console.error("[EditProfile] Save failed:", backendMessage);
      Alert.alert(t("common.error"), backendMessage ?? t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
      >
        <View style={styles.formCard}>
          <Text style={styles.label}>{t("auth.editProfile.fullName")}</Text>
          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t("auth.editProfile.fullName")}
              />
            )}
          />
          {errors.fullName ? (
            <Text style={styles.errorText}>{t("common.required")}</Text>
          ) : null}

          <Text style={styles.label}>{t("auth.editProfile.phone")}</Text>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t("auth.editProfile.phone")}
                keyboardType="phone-pad"
              />
            )}
          />

          <Text style={styles.label}>{t("auth.editProfile.gender")}</Text>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.genderButton,
                  gender === option.value && styles.genderButtonActive,
                ]}
                onPress={() => setGender(option.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.genderText,
                    gender === option.value && styles.genderTextActive,
                  ]}
                >
                  {t(option.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>{t("auth.editProfile.dob")}</Text>
          <Controller
            control={control}
            name="dateOfBirth"
            render={({ field: { onChange, value } }) => (
              <DatePickerField
                value={value ?? ""}
                onChange={onChange}
                placeholder={
                  lang === "rw"
                    ? "Hitamo itariki"
                    : "Select date of birth"
                }
                maximumDate={new Date(new Date().getFullYear() - 10, 0, 1)}
              />
            )}
          />

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                {t("auth.editProfile.button")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 16, paddingBottom: 28, paddingTop: 16 },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
  },
  label: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.textPrimary,
  },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 4 },
  genderRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
  },
  genderButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + "10",
  },
  genderText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  genderTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  button: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.8 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});

export default EditProfileScreen;
