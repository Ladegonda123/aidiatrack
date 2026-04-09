import React, { useCallback, useLayoutEffect, useState } from "react";
import {
  Alert,
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

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const getErrorMessage = useCallback(
    (error: unknown): string => {
      if (isAxiosError(error)) {
        const message =
          typeof error.response?.data?.message === "string"
            ? error.response?.data?.message
            : "";

        if (message === "No patient found with this email") {
          return t("assignPatient.noPatient");
        }

        if (message === "This patient is already assigned to another doctor") {
          return t("assignPatient.alreadyAssigned");
        }

        if (message === "This patient is already assigned to you") {
          return t("assignPatient.alreadyAssignedToYou");
        }
      }

      return t("common.error");
    },
    [t],
  );

  const handleAssign = useCallback(async (): Promise<void> => {
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail.length === 0) {
      Alert.alert(t("common.error"), t("common.required"));
      return;
    }

    if (!trimmedEmail.includes("@")) {
      Alert.alert(t("common.error"), t("common.invalidEmail"));
      return;
    }

    try {
      setSubmitting(true);
      await assignPatient(trimmedEmail);
      Alert.alert(t("assignPatient.title"), t("assignPatient.success"), [
        {
          text: t("common.ok"),
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: unknown) {
      Alert.alert(t("common.error"), getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }, [email, getErrorMessage, navigation, t]);

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
});

export default AssignPatientScreen;
