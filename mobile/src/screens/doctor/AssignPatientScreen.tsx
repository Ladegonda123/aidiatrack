import React, { useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
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
import Avatar from "../../components/Avatar";
import { useAuth } from "../../hooks/useAuth";
import {
  assignPatient,
  PatientSearchResult,
  searchPatients,
} from "../../api/doctorAPI";
import { COLORS } from "../../utils/colors";
import { RootStackParamList } from "../../types";

const AssignPatientScreen = (): React.JSX.Element => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const currentDoctorId = user?.id ?? null;
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [selectedPatient, setSelectedPatient] =
    useState<PatientSearchResult | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
    detail?: string;
    patientName?: string;
    patientEmail?: string;
  } | null>(null);
  const searchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  React.useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  const handleSearch = (text: string): void => {
    setSearchQuery(text);
    setSelectedPatient(null);
    setResult(null);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (text.length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        setSearching(true);
        const patients = await searchPatients(text);
        setSearchResults(patients);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleAssign = async (): Promise<void> => {
    if (!selectedPatient) return;

    try {
      setSubmitting(true);
      setResult(null);

      const response = await assignPatient(selectedPatient.email);
      const patient = response.data?.data?.patient;

      setResult({
        type: "success",
        message: t("doctor.assign.success"),
        patientName: patient?.fullName,
        patientEmail: patient?.email,
      });
      setSearchQuery("");
      setSelectedPatient(null);
      setSearchResults([]);
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

        <View style={styles.content}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Text style={styles.label}>
                {t("doctor.assign.searchLabel") ?? "Search Patient"}
              </Text>

              <View style={styles.searchContainer}>
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={COLORS.textSecondary}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder={
                    t("doctor.assign.searchPlaceholder") ??
                    "Type name or email..."
                  }
                  placeholderTextColor={COLORS.textSecondary}
                  value={searchQuery}
                  onChangeText={handleSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searching && (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                )}
                {searchQuery.length > 0 && !searching && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      setSelectedPatient(null);
                    }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {searchResults.length > 0 && !selectedPatient && (
              <View style={styles.resultsDropdown}>
                {searchResults.map((patient, index) => (
                  <TouchableOpacity
                    key={patient.id}
                    style={[
                      styles.resultItem,
                      index < searchResults.length - 1 &&
                        styles.resultItemBorder,
                    ]}
                    onPress={() => {
                      setSelectedPatient(patient);
                      setSearchQuery(patient.fullName);
                      setSearchResults([]);
                    }}
                    activeOpacity={0.7}
                  >
                    <Avatar
                      photoUrl={patient.photoUrl}
                      name={patient.fullName}
                      size={36}
                    />
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{patient.fullName}</Text>
                      <Text style={styles.resultEmail}>{patient.email}</Text>
                    </View>
                    {patient.doctorId ? (
                      <View
                        style={
                          patient.doctorId === currentDoctorId
                            ? styles.ownedBadge
                            : styles.assignedBadge
                        }
                      >
                        <Text
                          style={
                            patient.doctorId === currentDoctorId
                              ? styles.ownedBadgeText
                              : styles.assignedBadgeText
                          }
                        >
                          {patient.doctorId === currentDoctorId
                            ? (t("doctor.assign.yours") ?? "Yours")
                            : (t("doctor.assign.assigned") ?? "Assigned")}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.freeBadge}>
                        <Text style={styles.freeBadgeText}>
                          {t("doctor.assign.free") ?? "Available"}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {selectedPatient && (
              <View style={styles.selectedPatient}>
                <Avatar
                  photoUrl={selectedPatient.photoUrl}
                  name={selectedPatient.fullName}
                  size={42}
                />
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedName}>
                    {selectedPatient.fullName}
                  </Text>
                  <Text style={styles.selectedEmail}>
                    {selectedPatient.email}
                  </Text>
                </View>
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={COLORS.success}
                />
              </View>
            )}

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
                      result.type === "success"
                        ? COLORS.success
                        : COLORS.danger,
                  },
                ]}
              >
                <Ionicons
                  name={
                    result.type === "success"
                      ? "checkmark-circle"
                      : "close-circle"
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
              disabled={!selectedPatient || submitting}
              activeOpacity={0.9}
            >
              {submitting ? (
                <Text style={styles.buttonText}>{t("common.loading")}</Text>
              ) : (
                <Text style={styles.buttonText}>
                  {t("assignPatient.button")}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
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
    backgroundColor: COLORS.primary,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
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
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  scroll: {
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    padding: 0,
  },
  resultsDropdown: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  resultItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultInfo: { flex: 1 },
  resultName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  resultEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  assignedBadge: {
    backgroundColor: COLORS.warning + "20",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  ownedBadge: {
    backgroundColor: COLORS.success + "20",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  assignedBadgeText: {
    fontSize: 11,
    color: COLORS.warning,
    fontWeight: "700",
  },
  ownedBadgeText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: "700",
  },
  freeBadge: {
    backgroundColor: COLORS.success + "20",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  freeBadgeText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: "700",
  },
  selectedPatient: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.success + "10",
    borderWidth: 1.5,
    borderColor: COLORS.success + "40",
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  selectedInfo: { flex: 1 },
  selectedName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  selectedEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
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
