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
import { requestPasswordReset, verifyOtpAndReset } from "../../api/authAPI";
import { COLORS } from "../../utils/colors";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

const emailSchema = z.object({ email: z.string().email() });
const resetSchema = z
  .object({
    otp: z.string().length(6),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(1),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "mismatch",
    path: ["confirmPassword"],
  });

type EmailValues = z.infer<typeof emailSchema>;
type ResetValues = z.infer<typeof resetSchema>;

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: t("auth.forgotPassword.title"),
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

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleSendCode = async (values: EmailValues): Promise<void> => {
    try {
      setSending(true);
      const normalizedEmail = values.email.trim();
      await requestPasswordReset(normalizedEmail);
      setEmail(normalizedEmail);
      setStep(2);
    } catch {
      Alert.alert(t("common.error"));
    } finally {
      setSending(false);
    }
  };

  const handleReset = async (values: ResetValues): Promise<void> => {
    try {
      setResetting(true);
      await verifyOtpAndReset(email, values.otp, values.newPassword);
      Alert.alert(t("auth.forgotPassword.success"), undefined, [
        { text: t("common.ok"), onPress: () => navigation.navigate("Login") },
      ]);
    } catch {
      Alert.alert(t("common.error"));
    } finally {
      setResetting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
      >
        <View style={styles.headerCard}>
          <Text style={styles.subtitle}>{t("auth.forgotPassword.subtitle")}</Text>
        </View>

        {step === 1 ? (
          <View style={styles.formCard}>
              <Text style={styles.label}>
                {t("auth.forgotPassword.emailLabel")}
              </Text>
              <Controller
                control={emailForm.control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={t("auth.forgotPassword.emailLabel")}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                )}
              />
              <TouchableOpacity
                style={[styles.button, sending && styles.buttonDisabled]}
                onPress={emailForm.handleSubmit(handleSendCode)}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>
                    {t("auth.forgotPassword.sendCode")}
                  </Text>
                )}
              </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formCard}>
              <Text style={styles.label}>
                {t("auth.forgotPassword.step2Title")}
              </Text>
              <Text style={styles.hint}>
                {t("auth.forgotPassword.step2Subtitle")}
              </Text>

              <Controller
                control={resetForm.control}
                name="otp"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.otpInput}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={t("auth.forgotPassword.otpPlaceholder")}
                    keyboardType="numeric"
                    maxLength={6}
                    textAlign="center"
                  />
                )}
              />

              <Text style={styles.label}>
                {t("auth.forgotPassword.newPassword")}
              </Text>
              <Controller
                control={resetForm.control}
                name="newPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={t("auth.forgotPassword.newPassword")}
                    secureTextEntry
                  />
                )}
              />

              <Text style={styles.label}>
                {t("auth.forgotPassword.confirmPassword")}
              </Text>
              <Controller
                control={resetForm.control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={t("auth.forgotPassword.confirmPassword")}
                    secureTextEntry
                  />
                )}
              />

              <TouchableOpacity
                style={[styles.button, resetting && styles.buttonDisabled]}
                onPress={resetForm.handleSubmit(handleReset)}
                disabled={resetting}
              >
                {resetting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>
                    {t("auth.forgotPassword.resetButton")}
                  </Text>
                )}
              </TouchableOpacity>
          </View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 16, paddingBottom: 28, paddingTop: 16 },
  headerCard: { backgroundColor: COLORS.card, padding: 20, marginBottom: 16 },
  subtitle: { marginTop: 4, color: COLORS.textSecondary },
  formCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16 },
  label: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  hint: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.textPrimary,
  },
  otpInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    color: COLORS.textPrimary,
    fontSize: 22,
    letterSpacing: 8,
    marginBottom: 8,
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

export default ForgotPasswordScreen;
