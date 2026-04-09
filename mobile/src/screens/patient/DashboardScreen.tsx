import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import { getHealthSummary } from "../../api/healthAPI";
import { getMyMedications } from "../../api/medicationAPI";
import { getPredictionHistory } from "../../api/predictionAPI";
import {
  AppNotification,
  getNotifications,
  markAllRead,
} from "../../api/notificationAPI";
import {
  HealthRecord,
  HealthSummary,
  Medication,
  PatientTabParamList,
  Prediction,
} from "../../types";
import { COLORS, getBgColor } from "../../utils/colors";
import { formatDate, formatTime, timeAgo } from "../../utils/formatters";

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

const DashboardScreen = (): React.JSX.Element => {
  const { t, i18n } = useTranslation();
  const navigation =
    useNavigation<BottomTabNavigationProp<PatientTabParamList, "Dashboard">>();
  const { user } = useAuth();
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [lastPrediction, setLastPrediction] = useState<Prediction | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const lang = i18n.language as "en" | "rw";

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

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

      const notifData = await getNotifications();
      setNotifications(notifData.notifications);
      setUnreadCount(notifData.unreadCount);
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
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
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
              <View style={styles.headerLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {firstName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.greeting}>{greeting}</Text>
                  <Text style={styles.dateText}>
                    {formatDate(new Date(), lang)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.bellButton}
                onPress={() => setShowNotifications(true)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color="#FFFFFF"
                />
                {unreadCount > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>
                      {unreadCount > 9 ? "9+" : unreadCount.toString()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.streakBar}>
              <Ionicons name="flame-outline" size={16} color="#FFD700" />
              <Text style={styles.streakText}>
                {summary?.totalRecords ?? 0} {t("dashboard.totalRecords")}
              </Text>
              <View style={styles.streakDivider} />
              <Ionicons
                name="trending-up-outline"
                size={16}
                color="rgba(255,255,255,0.8)"
              />
              <Text style={styles.streakText}>
                {sevenDayAverage > 0
                  ? t("dashboard.mgdlAvg", { value: sevenDayAverage })
                  : t("dashboard.noReadings")}
              </Text>
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.card}>
              <View style={styles.readingCardHeader}>
                <Text style={styles.cardLabel}>
                  {t("dashboard.lastReading")}
                </Text>
                {lastReading && bgStatusKey ? (
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${bgColor}20` },
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, { color: bgColor }]}>
                      {t(bgStatusKey)}
                    </Text>
                  </View>
                ) : null}
              </View>
              {lastReading ? (
                <View style={styles.readingRow}>
                  <View>
                    <View style={styles.bgValueRow}>
                      <Text style={[styles.bgValue, { color: bgColor }]}>
                        {lastReading.bloodGlucose.toFixed(1)}
                      </Text>
                      <Text style={styles.bgUnit}>mg/dL</Text>
                    </View>
                    <Text style={styles.timeAgo}>
                      {timeAgo(lastReading.recordedAt, lang)}
                    </Text>
                  </View>
                  <View style={styles.miniTrend}>
                    {(summary?.trend?.slice(-5) ?? []).map((item, index) => {
                      const trendValues = summary?.trend?.slice(-5) ?? [];
                      const maxVal = Math.max(
                        ...trendValues.map((entry) => entry.value),
                      );
                      const minVal = Math.min(
                        ...trendValues.map((entry) => entry.value),
                      );
                      const range = maxVal - minVal || 1;
                      const height = ((item.value - minVal) / range) * 30 + 10;

                      return (
                        <View
                          key={`${item.date}-${index}`}
                          style={styles.miniBarWrapper}
                        >
                          <View
                            style={[
                              styles.miniBar,
                              {
                                height,
                                backgroundColor: getBgColor(item.value),
                                opacity: index === 4 ? 1 : 0.4 + index * 0.15,
                              },
                            ]}
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📊</Text>
                  <Text style={styles.emptyText}>
                    {t("dashboard.noReadings")}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.statsRow}>
              {[
                {
                  icon: "today-outline",
                  value: todayReadingCount.toString(),
                  label: t("dashboard.todayReadings"),
                  color: COLORS.primary,
                },
                {
                  icon: "analytics-outline",
                  value:
                    sevenDayAverage > 0 ? sevenDayAverage.toFixed(0) : "--",
                  label: t("dashboard.sevenDayAverage"),
                  color:
                    sevenDayAverage > 0
                      ? getBgColor(sevenDayAverage)
                      : COLORS.textSecondary,
                },
                {
                  icon: "list-outline",
                  value: (summary?.totalRecords ?? 0).toString(),
                  label: t("dashboard.totalRecords"),
                  color: COLORS.primary,
                },
              ].map((stat, index) => (
                <View key={index} style={styles.statCard}>
                  <Ionicons
                    name={stat.icon as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={stat.color}
                  />
                  <Text style={[styles.statValue, { color: stat.color }]}>
                    {stat.value}
                  </Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.logButton}
              onPress={() => navigation.navigate("LogHealth")}
              activeOpacity={0.85}
            >
              <View style={styles.logButtonInner}>
                <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
                <Text style={styles.logButtonText}>
                  {t("dashboard.logReading")}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="rgba(255,255,255,0.7)"
              />
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
                  <Text style={styles.alertTitle}>
                    {t("dashboard.aiAlert")}
                  </Text>
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

      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.notifOverlay}>
          <View style={styles.notifPanel}>
            <View style={styles.notifHandle} />

            <View style={styles.notifHeader}>
              <Text style={styles.notifTitle}>
                {t("notifications.panelTitle")}
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  await markAllRead();
                  setUnreadCount(0);
                  setNotifications((prev) =>
                    prev.map((notification) => ({
                      ...notification,
                      isRead: true,
                    })),
                  );
                }}
              >
                <Text style={styles.markReadText}>
                  {t("notifications.markAllRead")}
                </Text>
              </TouchableOpacity>
            </View>

            {notifications.length === 0 ? (
              <View style={styles.notifEmpty}>
                <Text style={styles.notifEmptyIcon}>🔔</Text>
                <Text style={styles.notifEmptyText}>
                  {t("notifications.empty")}
                </Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const iconMap: Record<AppNotification["type"], string> = {
                    chat: "💬",
                    medication: "💊",
                    bg_alert: "⚠️",
                    system: "ℹ️",
                  };

                  return (
                    <TouchableOpacity
                      style={[
                        styles.notifItem,
                        !item.isRead && styles.notifItemUnread,
                      ]}
                      onPress={() => {
                        if (item.type === "chat") {
                          setShowNotifications(false);
                          navigation.navigate("Chat");
                        } else if (item.type === "bg_alert") {
                          setShowNotifications(false);
                          navigation.navigate("Predictions");
                        }
                      }}
                    >
                      <Text style={styles.notifIcon}>{iconMap[item.type]}</Text>
                      <View style={styles.notifContent}>
                        <Text style={styles.notifItemTitle}>{item.title}</Text>
                        <Text style={styles.notifItemBody}>{item.body}</Text>
                        <Text style={styles.notifItemTime}>
                          {timeAgo(item.createdAt, lang)}
                        </Text>
                      </View>
                      {!item.isRead && <View style={styles.unreadDot} />}
                    </TouchableOpacity>
                  );
                }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}

            <TouchableOpacity
              style={styles.notifClose}
              onPress={() => setShowNotifications(false)}
            >
              <Text style={styles.notifCloseText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
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
  bellButton: {
    position: "relative",
    padding: 4,
  },
  bellBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  bellBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  streakBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  streakText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "500",
  },
  streakDivider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 4,
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
  readingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  readingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  bgValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
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
  timeAgo: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  miniTrend: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 44,
  },
  miniBarWrapper: {
    width: 8,
    height: 44,
    justifyContent: "flex-end",
  },
  miniBar: {
    width: 8,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 16,
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
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  logButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  logButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  notifOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  notifPanel: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    maxHeight: "75%",
  },
  notifHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  notifHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  notifTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  markReadText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
  },
  notifEmpty: {
    alignItems: "center",
    paddingVertical: 40,
  },
  notifEmptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  notifEmptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  notifItemUnread: {
    backgroundColor: `${COLORS.primary}08`,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  notifIcon: {
    fontSize: 24,
    marginTop: 2,
  },
  notifContent: {
    flex: 1,
  },
  notifItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  notifItemBody: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  notifItemTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 6,
  },
  notifClose: {
    paddingVertical: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 8,
  },
  notifCloseText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: "500",
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
