import React, { useLayoutEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { isAxiosError } from "axios";
import { assignPatient } from "../../api/doctorAPI";
import { COLORS } from "../../utils/colors";
import { RootStackParamList } from "../../types";

const AssignPatientScreen = (): React.JSX.Element => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const [email, setEmail] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
    detail?: string;
    patientName?: string;
    patientEmail?: string;
  } | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleAssign = async (): Promise<void> => {
    if (!email.trim()) return;

    try {
      setSubmitting(true);
      setResult(null);

      const response = await assignPatient(email.trim().toLowerCase());
      const patient = response.data?.data?.patient;

      setResult({
        type: "success",
        message: t("doctor.assign.success"),
        patientName: patient?.fullName,
        patientEmail: patient?.email,
      });
      setEmail("");
    } catch (err: unknown) {
      const backendMessage =
        isAxiosError(err) && typeof err?.response?.data?.message === "string"
          ? err.response.data.message
          : "";
      const status = isAxiosError(err) ? err?.response?.status : 0;

      let message = "";
      let detail = "";

      if (status === 404 || backendMessage === "NO_PATIENT_FOUND") {
        message =
          t("doctor.assign.notFound") ??
          "No patient found with this email address.";
        detail =
          t("doctor.assign.notFoundDetail") ??
          "Make sure the patient has registered in AIDiaTrack first.";
      } else if (backendMessage === "NOT_A_PATIENT") {
        message =
          t("doctor.assign.notAPatient") ??
          "This email belongs to a doctor account, not a patient.";
        detail = "";
      } else if (backendMessage === "ALREADY_YOUR_PATIENT") {
        message =
          t("doctor.assign.alreadyYours") ??
          "This patient is already assigned to you.";
        detail = "";
      } else if (backendMessage?.startsWith("ASSIGNED_TO_OTHER:")) {
        const otherDoctorName = backendMessage.split(":")[1];
        message =
          t("doctor.assign.alreadyAssigned") ??
          "This patient is already assigned to another doctor.";
        detail = `${t("doctor.assign.assignedTo") ?? "Currently with"}: Dr. ${otherDoctorName}`;
      } else {
        message = t("common.error");
        detail = "";
      }

      setResult({ type: "error", message, detail });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{t("assignPatient.title")}</Text>
            <Text style={styles.headerSubtitle}>
              {t("assignPatient.subtitle")}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.label}>{t("assignPatient.emailLabel")}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholder={t("assignPatient.emailPlaceholder")}
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
            />
            <Text style={styles.helper}>{t("assignPatient.helper")}</Text>
          </View>

          {result && (
            <View
              style={[
                styles.resultBox,
                {
                  backgroundColor:
                    result.type === "success"
                      ? COLORS.success + "12"
                      : COLORS.danger + "12",
                  borderColor:
                    result.type === "success" ? COLORS.success : COLORS.danger,
                },
              ]}
            >
              <Ionicons
                name={
                  result.type === "success" ? "checkmark-circle" : "close-circle"
                }
                size={22}
                color={
                  result.type === "success" ? COLORS.success : COLORS.danger
                }
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={[
                    styles.resultMessage,
                    {
                      color:
                        result.type === "success"
                          ? COLORS.success
                          : COLORS.danger,
                    },
                  ]}
                >
                  {result.message}
                </Text>
                {result.type === "success" && result.patientName && (
                  <View style={styles.patientConfirm}>
                    <Ionicons
                      name="person-outline"
                      size={14}
                      color={COLORS.success}
                    />
                    <Text style={styles.patientConfirmText}>
                      {result.patientName}
                    </Text>
                  </View>
                )}
                {result.detail ? (
                  <Text style={styles.resultDetail}>{result.detail}</Text>
                ) : null}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={() => {
              handleAssign().catch(() => undefined);
            }}
            disabled={submitting}
            activeOpacity={0.9}
          >
            {submitting ? (
              <Text style={styles.buttonText}>{t("common.loading")}</Text>
            ) : (
              <Text style={styles.buttonText}>{t("assignPatient.button")}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 19,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  helper: {
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  resultBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  resultMessage: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  resultDetail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  patientConfirm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  patientConfirmText: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: "500",
  },
});

export default AssignPatientScreen;
