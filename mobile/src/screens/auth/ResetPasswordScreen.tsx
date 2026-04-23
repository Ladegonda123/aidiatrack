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
import { Ionicons } from "@expo/vector-icons";
import { z } from "zod";
import { verifyOtpAndReset } from "../../api/authAPI";
import { RootStackParamList } from "../../types";
import { COLORS } from "../../utils/colors";

type Props = NativeStackScreenProps<RootStackParamList, "ResetPassword">;

const schema = z
  .object({
    newPassword: z.string().min(8, { message: "auth.validation.passwordMin8" }),
    confirmPassword: z
      .string()
      .min(1, { message: "auth.validation.passwordRequired" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "auth.validation.passwordMismatch",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

const ResetPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { email, otp } = route.params;
  const [showNew, setShowNew] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: t("auth.forgotPassword.resetTitle"),
      headerStyle: { backgroundColor: COLORS.card },
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
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const getErrorMessage = (error: unknown): string => {
    if (typeof error === "object" && error !== null && "response" in error) {
      const response = error as {
        response?: { data?: { message?: string } };
      };
      return response.response?.data?.message ?? "";
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "";
  };

  const onSubmit = async (data: FormValues): Promise<void> => {
    try {
      setSubmitting(true);
      setApiError(null);
      await verifyOtpAndReset(email, otp, data.newPassword);
      Alert.alert(t("auth.forgotPassword.success"), undefined, [
        {
          text: t("common.ok"),
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          },
        },
      ]);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      if (message.includes("Invalid") || message.includes("expired")) {
        setApiError(t("auth.forgotPassword.invalidOtp"));
      } else {
        setApiError(t("common.error"));
      }
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
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons
              name="lock-closed-outline"
              size={40}
              color={COLORS.primary}
            />
          </View>
        </View>

        <Text style={styles.title}>{t("auth.forgotPassword.resetTitle")}</Text>
        <Text style={styles.description}>
          {t("auth.forgotPassword.resetSubtitle")}
        </Text>

        <Text style={styles.label}>{t("auth.changePassword.new")}</Text>
        <View style={styles.passwordContainer}>
          <Controller
            control={control}
            name="newPassword"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!showNew}
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          <TouchableOpacity onPress={() => setShowNew((prev) => !prev)}>
            <Ionicons
              name={showNew ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>
        {errors.newPassword ? (
          <Text style={styles.errorText}>
            {t(errors.newPassword.message ?? "common.error")}
          </Text>
        ) : null}

        <Text style={styles.label}>{t("auth.changePassword.confirm")}</Text>
        <View style={styles.passwordContainer}>
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!showConfirm}
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          <TouchableOpacity onPress={() => setShowConfirm((prev) => !prev)}>
            <Ionicons
              name={showConfirm ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword ? (
          <Text style={styles.errorText}>
            {t(errors.confirmPassword.message ?? "common.error")}
          </Text>
        ) : null}

        {apiError ? <Text style={styles.errorText}>{apiError}</Text> : null}

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {t("auth.forgotPassword.resetButton")}
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 32,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    gap: 10,
    width: "100%",
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    padding: 0,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.danger,
    marginBottom: 12,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default ResetPasswordScreen;
