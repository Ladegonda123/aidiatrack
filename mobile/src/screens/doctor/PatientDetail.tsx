import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../utils/colors";

const PatientDetail = (): React.JSX.Element => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("doctor.patientDetail.title")}</Text>
      <Text style={styles.subtitle}>{t("doctor.patientDetail.noRecords")}</Text>
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

export default PatientDetail;
