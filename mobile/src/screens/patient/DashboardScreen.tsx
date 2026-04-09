import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import LanguageDropdown from "../../components/LanguageDropdown";
import { useAuth } from "../../hooks/useAuth";
import { getHealthSummary } from "../../api/healthAPI";
import { getMyMedications } from "../../api/medicationAPI";
import { getPredictionHistory } from "../../api/predictionAPI";
import {
  HealthRecord,
  HealthSummary,
  Medication,
  PatientTabParamList,
  Prediction,
} from "../../types";
import { COLORS, getBgColor } from "../../utils/colors";
import { formatDate, formatTime, timeAgo } from "../../utils/formatters";

type Props = BottomTabScreenProps<PatientTabParamList, "Dashboard">;

const getNextReminder = (
  meds: Medication[],
): {
  med: Medication;
  time: string;
} | null => {
  if (meds.length === 0) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let earliest: { med: Medication; time: string; minutes: number } | null =
    null;

  for (const med of meds) {
    for (const time of med.reminderTimes) {
      const [h, m] = time.split(":").map(Number);
      const totalMins = h * 60 + m;
      const diff =
        totalMins > currentMinutes
          ? totalMins - currentMinutes
          : totalMins + 24 * 60 - currentMinutes;

      if (!earliest || diff < earliest.minutes) {
        earliest = { med, time, minutes: diff };
      }
    }
  }

  return earliest ? { med: earliest.med, time: earliest.time } : null;
};

const getGreetingKey = (
  hour: number,
):
  | "dashboard.greeting_morning"
  | "dashboard.greeting_afternoon"
  | "dashboard.greeting_evening" => {
  if (hour < 12) return "dashboard.greeting_morning";
  if (hour < 18) return "dashboard.greeting_afternoon";
  return "dashboard.greeting_evening";
};

const getBgStatusKey = (
  value: number,
):
  | "bgLabels.low"
  | "bgLabels.normal"
  | "bgLabels.preDiabetic"
  | "bgLabels.high" => {
  if (value < 70) return "bgLabels.low";
  if (value < 140) return "bgLabels.normal";
  if (value < 200) return "bgLabels.preDiabetic";
  return "bgLabels.high";
};

const formatReminderClock = (time: string): string => {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return formatTime(date);
};

const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { user, updateLanguage } = useAuth();
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [lastPrediction, setLastPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadDashboard = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const [summaryData, medsData, predictionsData] = await Promise.all([
        getHealthSummary(),
        getMyMedications(),
        getPredictionHistory(1),
      ]);

      setSummary(summaryData);
      setMedications(medsData.filter((m) => m.isActive));
      setLastPrediction(predictionsData[0] ?? null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("[Dashboard] Load failed:", message);
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadDashboard().catch(() => undefined);
  }, [loadDashboard]);

  const onRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, [loadDashboard]);

  const firstName = user?.fullName.split(" ")[0] ?? "";
  const greeting = t(getGreetingKey(new Date().getHours()), {
    name: firstName,
  });

  const lastReading = summary?.lastReading as HealthRecord | null;
  const bgValue = lastReading?.bloodGlucose;
  const bgColor =
    bgValue !== undefined ? getBgColor(bgValue) : COLORS.textPrimary;
  const bgStatusKey = bgValue !== undefined ? getBgStatusKey(bgValue) : null;

  const sevenDayAverage = useMemo((): number => {
    const trend = summary?.trend ?? [];
    if (trend.length === 0) return 0;
    const total = trend.reduce((sum, item) => sum + item.value, 0);
    return Number((total / trend.length).toFixed(1));
  }, [summary?.trend]);

  const todayReadingCount = useMemo((): number => {
    const trend = summary?.trend ?? [];
    const today = new Date();
    return trend.filter((item) => {
      const date = new Date(item.date);
      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    }).length;
  }, [summary?.trend]);

  const nextReminder = useMemo(
    () => getNextReminder(medications),
    [medications],
  );

  const shouldShowAlert =
    lastPrediction !== null && lastPrediction.riskLevel !== "LOW";

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>{error}</Text>
        <TouchableOpacity style={styles.logButton} onPress={loadDashboard}>
          <Text style={styles.logButtonText}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.dateText}>{formatDate(new Date())}</Text>
            </View>
            <LanguageDropdown onLanguageChange={updateLanguage} />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t("dashboard.lastReading")}</Text>
            {lastReading ? (
              <>
                <Text style={[styles.bgValue, { color: bgColor }]}>
                  {lastReading.bloodGlucose.toFixed(1)}
                </Text>
                <Text style={styles.bgUnit}>{t("dashboard.mgdlUnit")}</Text>
                {bgStatusKey ? (
                  <Text style={[styles.bgStatus, { color: bgColor }]}>
                    {t(bgStatusKey)}
                  </Text>
                ) : null}
                <Text style={styles.timeAgo}>
                  {timeAgo(lastReading.recordedAt)}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyText}>
                  {t("dashboard.noReadings")}
                </Text>
              </>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{todayReadingCount}</Text>
              <Text style={styles.statLabel}>
                {t("dashboard.todayReadings")}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{sevenDayAverage.toFixed(1)}</Text>
              <Text style={styles.statLabel}>
                {t("dashboard.sevenDayAverage")}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{summary?.totalRecords ?? 0}</Text>
              <Text style={styles.statLabel}>
                {t("dashboard.totalRecords")}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.logButton}
            onPress={() => navigation.navigate("LogHealth")}
            activeOpacity={0.9}
          >
            <Text style={styles.logButtonText}>+</Text>
            <Text style={styles.logButtonText}>
              {t("dashboard.logReading")}
            </Text>
          </TouchableOpacity>

          {shouldShowAlert ? (
            <TouchableOpacity
              style={[
                styles.alertCard,
                {
                  backgroundColor:
                    lastPrediction.riskLevel === "HIGH"
                      ? COLORS.danger
                      : COLORS.warning,
                },
              ]}
              onPress={() => navigation.navigate("Predictions")}
              activeOpacity={0.9}
            >
              <Text>⚠️</Text>
              <View style={styles.alertText}>
                <Text style={styles.alertTitle}>{t("dashboard.aiAlert")}</Text>
                <Text style={styles.alertBody}>
                  {t("dashboard.highRiskWarning")}
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.card, styles.medCard]}
            onPress={() => navigation.navigate("Profile")}
            activeOpacity={0.9}
          >
            <Text style={styles.medIcon}>💊</Text>
            <View style={styles.alertText}>
              <Text style={styles.cardLabel}>
                {t("dashboard.nextMedication")}
              </Text>
              {nextReminder ? (
                <>
                  <Text style={styles.medName}>
                    {nextReminder.med.drugName} {nextReminder.med.dosage}
                  </Text>
                  <Text style={styles.medTime}>
                    {formatReminderClock(nextReminder.time)}
                  </Text>
                </>
              ) : (
                <Text style={styles.medTime}>
                  {t("dashboard.noMedications")}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 8,
  },
  dateText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  bgValue: {
    fontSize: 48,
    fontWeight: "800",
    lineHeight: 56,
  },
  bgUnit: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bgStatus: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  timeAgo: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  logButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  alertCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  alertText: {
    flex: 1,
  },
  alertTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  alertBody: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    marginTop: 2,
  },
  medCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  medIcon: {
    fontSize: 28,
  },
  medName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  medTime: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 14,
    padding: 16,
  },
  emptyIcon: {
    textAlign: "center",
    fontSize: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    gap: 16,
  },
});

export default DashboardScreen;
