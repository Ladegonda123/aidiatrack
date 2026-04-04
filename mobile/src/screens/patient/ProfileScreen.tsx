import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { COLORS } from "../../utils/colors";

const ProfileScreen = (): React.JSX.Element => {
  const { t } = useTranslation();
  const { user, updateLanguage, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("profile.title")}</Text>
      <Text style={styles.subtitle}>{user?.fullName ?? ""}</Text>

      <View style={styles.row}>
        <TouchableOpacity
          style={styles.action}
          onPress={() => updateLanguage("en")}
        >
          <Text style={styles.actionText}>{t("profile.languageEn")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.action}
          onPress={() => updateLanguage("rw")}
        >
          <Text style={styles.actionText}>{t("profile.languageRw")}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>{t("profile.logout")}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 12,
    color: COLORS.textSecondary,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  action: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionText: {
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  logout: {
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  logoutText: {
    color: COLORS.card,
    fontWeight: "700",
  },
});

export default ProfileScreen;
