import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { requestPasswordReset } from "../../api/authAPI";
import { RootStackParamList } from "../../types";
import { COLORS } from "../../utils/colors";

type Props = NativeStackScreenProps<RootStackParamList, "VerifyOtp">;

const DIGITS = 6;

const VerifyOtpScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { email } = route.params;
  const [otp, setOtp] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: t("auth.forgotPassword.step2Title"),
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

  useEffect(() => {
    if (canResend) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [canResend]);

  const handleOtpChange = (text: string): void => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, DIGITS);
    setOtp(cleaned);

    if (cleaned.length === DIGITS) {
      Keyboard.dismiss();
    }
  };

  const handleResend = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await requestPasswordReset(email);
      setCountdown(60);
      setCanResend(false);
      setOtp("");
      inputRef.current?.focus();
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      navigation.navigate("ResetPassword", { email, otp });
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons
              name="shield-checkmark-outline"
              size={40}
              color={COLORS.primary}
            />
          </View>
        </View>

        <Text style={styles.title}>{t("auth.forgotPassword.step2Title")}</Text>
        <Text style={styles.description}>
          {t("auth.forgotPassword.step2Subtitle")}
        </Text>
        <Text style={styles.emailHighlight}>{email}</Text>

        <TouchableOpacity
          style={styles.otpContainer}
          onPress={() => inputRef.current?.focus()}
          activeOpacity={1}
        >
          {Array.from({ length: DIGITS }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.otpBox,
                otp.length === index && styles.otpBoxActive,
                otp.length > index && styles.otpBoxFilled,
              ]}
            >
              <Text style={styles.otpDigit}>{otp[index] ?? ""}</Text>
            </View>
          ))}
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={otp}
          onChangeText={handleOtpChange}
          keyboardType="number-pad"
          maxLength={DIGITS}
          autoFocus
          caretHidden
        />

        {canResend ? (
          <TouchableOpacity style={styles.resendButton} onPress={handleResend}>
            {loading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Text style={styles.resendText}>
                {t("auth.forgotPassword.resendCode")}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <Text style={styles.resendCountdown}>
            {t("auth.forgotPassword.resendIn")} {countdown}s
          </Text>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[
            styles.button,
            (otp.length < DIGITS || loading) && styles.buttonDisabled,
          ]}
          onPress={handleVerify}
          disabled={otp.length < DIGITS || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {t("auth.forgotPassword.verifyButton")}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    alignItems: "center",
  },
  iconContainer: {
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
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  emailHighlight: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 32,
    textAlign: "center",
  },
  otpContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxActive: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  otpBoxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + "08",
  },
  otpDigit: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  resendButton: {
    marginBottom: 20,
  },
  resendText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
    textAlign: "center",
  },
  resendCountdown: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.danger,
    textAlign: "center",
    marginBottom: 12,
    width: "100%",
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default VerifyOtpScreen;
