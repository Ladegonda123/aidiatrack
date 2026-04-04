import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../utils/colors";

const LogHealthScreen = (): React.JSX.Element => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("logHealth.title")}</Text>
      <Text style={styles.subtitle}>{t("logHealth.bloodGlucoseHint")}</Text>
      <Text style={styles.hint}>{t("logHealth.weightHint")}</Text>
      <Text style={styles.hint}>{t("logHealth.bloodPressureHint")}</Text>
      <Text style={styles.hint}>{t("logHealth.hba1cHint")}</Text>
      <Text style={styles.hint}>{t("logHealth.insulinHint")}</Text>
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
    marginBottom: 12,
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  hint: {
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontStyle: "italic",
  },
});

export default LogHealthScreen;
