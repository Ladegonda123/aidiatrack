import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../utils/colors";

const DoctorDashboard = (): React.JSX.Element => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("doctor.dashboard.title")}</Text>
      <Text style={styles.subtitle}>{t("doctor.dashboard.noPatients")}</Text>
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
    marginTop: 8,
    color: COLORS.textSecondary,
  },
});

export default DoctorDashboard;
