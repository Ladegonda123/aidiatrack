import React, { useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { z } from "zod";
import LanguageDropdown from "../../components/LanguageDropdown";
import { RootStackParamList, UserRole } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { COLORS } from "../../utils/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

const registerSchema = z.object({
  fullName: z.string().min(2, { message: "auth.validation.fullNameMin" }),
  email: z
    .string()
    .min(1, { message: "auth.validation.emailRequired" })
    .email({ message: "auth.validation.emailInvalid" }),
  password: z.string().min(8, { message: "auth.validation.passwordMin8" }),
  role: z.enum(["PATIENT", "DOCTOR"], {
    message: "auth.validation.roleRequired",
  }),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^\d{10,15}$/.test(value), {
      message: "auth.validation.phoneDigits",
    }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <LanguageDropdown />,
      headerStyle: { backgroundColor: COLORS.background },
      headerTintColor: COLORS.primary,
      headerShadowVisible: false,
    });
  }, [navigation, i18n.language]);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      role: "PATIENT",
      phone: "",
    },
  });

  const selectedRole = watch("role");

  const onRegister = async (values: RegisterFormValues): Promise<void> => {
    try {
      setLoading(true);
      setRegisterError(null);

      const currentLanguage = i18n.language === "en" ? "en" : "rw";

      await register({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
        role: values.role as UserRole,
        phone: values.phone?.trim() ? values.phone.trim() : undefined,
        language: currentLanguage,
      });
    } catch {
      setRegisterError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={20}
        extraHeight={120}
      >
        <Text style={styles.title}>{t("auth.register.title")}</Text>
        <Text style={styles.subtitle}>{t("auth.register.subtitle")}</Text>

        <View style={styles.formContainer}>
          <Text style={styles.label}>
            {t("auth.register.fullNamePlaceholder")}
          </Text>
          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t("auth.register.fullNamePlaceholder")}
                autoCapitalize="words"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            )}
          />
          {errors.fullName?.message && (
            <Text style={styles.validationError}>
              {t(errors.fullName.message)}
            </Text>
          )}

          <Text style={styles.label}>
            {t("auth.register.emailPlaceholder")}
          </Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                ref={emailRef}
                style={styles.input}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t("auth.register.emailPlaceholder")}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            )}
          />
          {errors.email?.message && (
            <Text style={styles.validationError}>
              {t(errors.email.message)}
            </Text>
          )}

          <Text style={styles.label}>
            {t("auth.register.passwordPlaceholder")}
          </Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  ref={passwordRef}
                  style={styles.passwordInput}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t("auth.register.passwordPlaceholder")}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textContentType="newPassword"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => phoneRef.current?.focus()}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((prev) => !prev)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword
                      ? t("auth.login.hidePassword")
                      : t("auth.login.showPassword")
                  }
                >
                  <MaterialCommunityIcons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            )}
          />
          {errors.password?.message && (
            <Text style={styles.validationError}>
              {t(errors.password.message)}
            </Text>
          )}

          <Text style={styles.label}>{t("auth.register.rolePicker")}</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === "PATIENT"
                  ? styles.roleCardSelected
                  : styles.roleCardUnselected,
              ]}
              onPress={() =>
                setValue("role", "PATIENT", { shouldValidate: true })
              }
            >
              <MaterialCommunityIcons
                name="account"
                size={26}
                color={
                  selectedRole === "PATIENT"
                    ? COLORS.primary
                    : COLORS.textSecondary
                }
              />
              <Text style={styles.roleCardText}>
                {t("auth.register.rolePatientCombined")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === "DOCTOR"
                  ? styles.roleCardSelected
                  : styles.roleCardUnselected,
              ]}
              onPress={() =>
                setValue("role", "DOCTOR", { shouldValidate: true })
              }
            >
              <MaterialCommunityIcons
                name="stethoscope"
                size={26}
                color={
                  selectedRole === "DOCTOR"
                    ? COLORS.primary
                    : COLORS.textSecondary
                }
              />
              <Text style={styles.roleCardText}>
                {t("auth.register.roleDoctorCombined")}
              </Text>
            </TouchableOpacity>
          </View>
          {errors.role?.message && (
            <Text style={styles.validationError}>{t(errors.role.message)}</Text>
          )}

          <Text style={styles.label}>
            {t("auth.register.phoneLabel")} ({t("common.optional")})
          </Text>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                ref={phoneRef}
                style={styles.input}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t("auth.register.phonePlaceholder")}
                keyboardType="phone-pad"
                autoCapitalize="none"
                returnKeyType="done"
                blurOnSubmit={true}
              />
            )}
          />
          {errors.phone?.message && (
            <Text style={styles.validationError}>
              {t(errors.phone.message)}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.button, loading ? styles.buttonDisabled : undefined]}
            onPress={handleSubmit(onRegister)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.card} />
            ) : (
              <Text style={styles.buttonText}>{t("auth.register.button")}</Text>
            )}
          </TouchableOpacity>

          {registerError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorCardText}>{registerError}</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("Login")}
          style={styles.bottomLinkContainer}
        >
          <Text style={styles.link}>
            {t("auth.register.hasAccount")} {t("auth.register.login")}
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardAvoiding: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.primary,
    textAlign: "center",
    marginTop: 10,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  formContainer: {
    marginTop: 8,
  },
  label: {
    color: COLORS.textPrimary,
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.textPrimary,
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.textPrimary,
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  roleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 2,
  },
  roleCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  roleCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "#EAF4FB",
  },
  roleCardUnselected: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  roleCardText: {
    marginTop: 8,
    textAlign: "center",
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  validationError: {
    color: COLORS.danger,
    marginTop: 4,
    marginBottom: 10,
    fontSize: 12,
  },
  button: {
    marginTop: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  buttonDisabled: {
    opacity: 0.8,
  },
  buttonText: {
    color: COLORS.card,
    fontWeight: "700",
    fontSize: 16,
  },
  errorCard: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
    backgroundColor: "#FDECEC",
    padding: 12,
  },
  errorCardText: {
    color: COLORS.danger,
    fontWeight: "600",
    textAlign: "center",
  },
  bottomLinkContainer: {
    marginTop: "auto",
    paddingVertical: 10,
  },
  link: {
    color: COLORS.primary,
    textAlign: "center",
    fontWeight: "600",
  },
});

export default RegisterScreen;
