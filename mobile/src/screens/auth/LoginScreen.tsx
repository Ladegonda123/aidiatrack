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
import { RootStackParamList } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { COLORS } from "../../utils/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "auth.validation.emailRequired" })
    .email({ message: "auth.validation.emailInvalid" }),
  password: z.string().min(1, { message: "auth.validation.passwordRequired" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onLogin = async (values: LoginFormValues): Promise<void> => {
    try {
      setLoading(true);
      setLoginError(null);
      await login(values.email.trim(), values.password);
    } catch {
      setLoginError(t("auth.login.error"));
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
        <View style={styles.heroBlock}>
          <Text style={styles.logo}>{t("common.appName")}</Text>
          <Text style={styles.tagline}>{t("auth.login.subtitle")}</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>{t("auth.login.emailPlaceholder")}</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t("auth.login.emailPlaceholder")}
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
            {t("auth.login.passwordPlaceholder")}
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
                  placeholder={t("auth.login.passwordPlaceholder")}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textContentType="password"
                  returnKeyType="done"
                  blurOnSubmit={true}
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

          <TouchableOpacity
            style={[styles.button, loading ? styles.buttonDisabled : undefined]}
            onPress={handleSubmit(onLogin)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.card} />
            ) : (
              <Text style={styles.buttonText}>{t("auth.login.button")}</Text>
            )}
          </TouchableOpacity>

          {loginError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorCardText}>{loginError}</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("Register")}
          style={styles.bottomLinkContainer}
        >
          <Text style={styles.link}>
            {t("auth.login.noAccount")} {t("auth.login.register")}
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
  heroBlock: {
    marginTop: 20,
    marginBottom: 26,
    alignItems: "center",
  },
  logo: {
    fontSize: 34,
    fontWeight: "800",
    color: COLORS.primary,
  },
  tagline: {
    marginTop: 8,
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  formContainer: {
    backgroundColor: "transparent",
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
    paddingVertical: 12,
  },
  link: {
    color: COLORS.primary,
    textAlign: "center",
    fontWeight: "600",
  },
});

export default LoginScreen;
