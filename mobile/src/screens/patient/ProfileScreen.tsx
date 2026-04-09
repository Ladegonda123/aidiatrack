import React, { useLayoutEffect } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import LanguageDropdown from "../../components/LanguageDropdown";
import { useAuth } from "../../hooks/useAuth";
import { COLORS } from "../../utils/colors";
import { formatDate } from "../../utils/formatters";
import { RootStackParamList } from "../../types";

const ProfileScreen = (): React.JSX.Element => {
  const { t, i18n } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout, updateLanguage } = useAuth();
  const lang = i18n.language as "en" | "rw";

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleLogout = (): void => {
    Alert.alert(t("profile.logout"), t("profile.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.logout"),
        style: "destructive",
        onPress: () => {
          logout().catch(() => undefined);
        },
      },
    ]);
  };

  const infoRows = [
    {
      icon: "person-outline",
      label: t("profile.fullName"),
      value: user?.fullName ?? "--",
    },
    {
      icon: "mail-outline",
      label: t("profile.email"),
      value: user?.email ?? "--",
    },
    {
      icon: "call-outline",
      label: t("profile.phone"),
      value: user?.phone ?? "--",
    },
    {
      icon: "calendar-outline",
      label: t("profile.memberSince"),
      value: user?.createdAt ? formatDate(user.createdAt, lang) : "--",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {user?.fullName?.charAt(0).toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text style={styles.name}>{user?.fullName}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user?.role === "PATIENT"
                ? t("auth.register.rolePatient")
                : t("auth.register.roleDoctor")}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          {infoRows.map((row, index) => (
            <View
              key={row.label}
              style={[
                styles.infoRow,
                index < infoRows.length - 1 && styles.infoRowBorder,
              ]}
            >
              <View style={styles.infoLeft}>
                <Ionicons
                  name={row.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={COLORS.primary}
                />
                <Text style={styles.infoLabel}>{row.label}</Text>
              </View>
              <Text style={styles.infoValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.language")}</Text>
          <View style={styles.languageRow}>
            <View style={styles.infoLeft}>
              <Ionicons
                name="language-outline"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.infoLabel}>{t("profile.language")}</Text>
            </View>
            <LanguageDropdown onLanguageChange={updateLanguage} />
          </View>
        </View>

        {user?.role === "DOCTOR" ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("profile.doctorActionsTitle")}
            </Text>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("AssignPatient")}
              activeOpacity={0.85}
            >
              <View style={styles.actionButtonLeft}>
                <Ionicons
                  name="person-add-outline"
                  size={18}
                  color={COLORS.primary}
                />
                <View>
                  <Text style={styles.actionButtonText}>
                    {t("profile.assignPatient")}
                  </Text>
                  <Text style={styles.actionButtonSubtext}>
                    {t("profile.assignPatientHint")}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>
        ) : null}

        {user?.role === "PATIENT" ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("profile.patientActionsTitle")}
            </Text>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("SelectDoctor")}
              activeOpacity={0.85}
            >
              <View style={styles.actionButtonLeft}>
                <Ionicons
                  name="medkit-outline"
                  size={18}
                  color={COLORS.primary}
                />
                <View>
                  <Text style={styles.actionButtonText}>
                    {t("profile.selectDoctor")}
                  </Text>
                  <Text style={styles.actionButtonSubtext}>
                    {t("profile.selectDoctorHint")}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>{t("profile.logout")}</Text>
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
  header: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  section: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingVertical: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
    maxWidth: 180,
    textAlign: "right",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  actionButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingRight: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  actionButtonSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  languageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 32,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    backgroundColor: `${COLORS.danger}08`,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: "600",
  },
});

export default ProfileScreen;
