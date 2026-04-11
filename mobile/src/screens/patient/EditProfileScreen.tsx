import React, { useLayoutEffect, useState } from "react";
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
import { saveUser } from "../../utils/storage";

type Props = NativeStackScreenProps<RootStackParamList, "EditProfile">;

const editProfileSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

type EditProfileValues = z.infer<typeof editProfileSchema>;

const GENDER_OPTIONS = [
  { value: "Male", labelKey: "auth.editProfile.genderMale" },
  { value: "Female", labelKey: "auth.editProfile.genderFemale" },
  { value: "Other", labelKey: "auth.editProfile.genderOther" },
];

const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const [saving, setSaving] = useState<boolean>(false);
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

  const onSubmit = async (values: EditProfileValues): Promise<void> => {
    try {
      setSaving(true);
      const updatedUser = await updateProfile({
        fullName: values.fullName.trim(),
        phone: values.phone?.trim() || undefined,
        gender: gender || undefined,
        dateOfBirth: values.dateOfBirth?.trim() || undefined,
      });
      setUser(updatedUser);
      await saveUser(updatedUser);
      Alert.alert(t("auth.editProfile.success"), undefined, [
        { text: t("common.ok"), onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert(t("common.error"));
    } finally {
      setSaving(false);
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
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t("auth.editProfile.dobHint")}
              />
            )}
          />
          <Text style={styles.hint}>{t("auth.editProfile.dobHint")}</Text>

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={saving}
          >
            {saving ? (
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
  hint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
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
