import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  CompositeNavigationProp,
  useFocusEffect,
  useNavigation,
} from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import NotificationPanel from "../../components/NotificationPanel";
import Avatar from "../../components/Avatar";
import { chatEvents, CHAT_EVENTS } from "../../utils/chatEvents";
import { getHealthSummary } from "../../api/healthAPI";
import { getMyMedications } from "../../api/medicationAPI";
import { getPredictionHistory } from "../../api/predictionAPI";
import { AppNotification, getNotifications } from "../../api/notificationAPI";
import {
  HealthRecord,
  HealthSummary,
  Medication,
  PatientTabParamList,
  Prediction,
  RootStackParamList,
} from "../../types";
import { COLORS, getBgColor } from "../../utils/colors";
import { formatDate, timeAgo } from "../../utils/formatters";

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

type DashboardNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<PatientTabParamList, "Dashboard">,
  NativeStackNavigationProp<RootStackParamList>
>;

const DashboardScreen = (): React.JSX.Element => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<DashboardNavigationProp>();
  const { user, refreshChatUnread, loading } = useAuth();
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [lastPrediction, setLastPrediction] = useState<Prediction | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [screenLoading, setScreenLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const activeChatUserIdRef = useRef<number | null>(null);
  const lang = i18n.language as "en" | "rw";

  const getNextMedication = (
    meds: Medication[],
  ): {
    med: Medication;
    time: string;
    isToday: boolean;
    minutesFromNow: number;
  } | null => {
    if (!meds || meds.length === 0) return null;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let closest: {
      med: Medication;
      time: string;
      minutesFromNow: number;
      isToday: boolean;
    } | null = null;

    for (const med of meds) {
      if (!med.isActive) continue;
      for (const timeStr of med.reminderTimes) {
        if (typeof timeStr !== "string") continue;
        const [h, m] = timeStr.split(":").map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) continue;

        const medMinutes = h * 60 + m;
        let minutesFromNow = medMinutes - currentMinutes;

        const isToday = minutesFromNow > 0;
        if (!isToday) minutesFromNow += 24 * 60;

        if (!closest || minutesFromNow < closest.minutesFromNow) {
          closest = { med, time: timeStr, minutesFromNow, isToday };
        }
      }
    }

    if (!closest) return null;
    return closest;
  };

  const getTimeDescription = (
    minutesFromNow: number,
    time: string,
    isToday: boolean,
    language: string,
  ): {
    urgency: "now" | "soon" | "later" | "tomorrow";
    label: string;
    color: string;
  } => {
    if (minutesFromNow <= 10) {
      return {
        urgency: "now",
        label: language === "rw" ? "Ubu nyine!" : "Right now!",
        color: COLORS.danger,
      };
    }

    if (minutesFromNow <= 60) {
      return {
        urgency: "soon",
        label:
          language === "rw"
            ? `Mu minota ${minutesFromNow}`
            : `In ${minutesFromNow} min`,
        color: COLORS.warning,
      };
    }

    if (isToday) {
      return {
        urgency: "later",
        label: language === "rw" ? `Uyu munsi saa ${time}` : `Today at ${time}`,
        color: COLORS.primary,
      };
    }

    return {
      urgency: "tomorrow",
      label: language === "rw" ? `Ejo saa ${time}` : `Tomorrow at ${time}`,
      color: COLORS.textSecondary,
    };
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const loadDashboard = useCallback(async (): Promise<void> => {
    try {
      setScreenLoading(true);
      setError(null);

      const [
        summaryResult,
        medsResult,
        predictionsResult,
        notificationsResult,
      ] = await Promise.allSettled([
        getHealthSummary(),
        getMyMedications(),
        getPredictionHistory(1),
        getNotifications(),
      ]);

      setSummary(
        summaryResult.status === "fulfilled" ? summaryResult.value : null,
      );

      const medicationsData =
        medsResult.status === "fulfilled" ? medsResult.value : [];
      setMedications(medicationsData.filter((m) => m.isActive));

      const predictionsData =
        predictionsResult.status === "fulfilled" ? predictionsResult.value : [];
      setLastPrediction(predictionsData[0] ?? null);

      if (notificationsResult.status === "fulfilled") {
        setNotifications(notificationsResult.value.notifications);
        setUnreadCount(notificationsResult.value.unreadCount);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }

      const allFailed =
        summaryResult.status === "rejected" &&
        medsResult.status === "rejected" &&
        predictionsResult.status === "rejected" &&
        notificationsResult.status === "rejected";

      if (allFailed) {
        setError(t("common.error"));
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setScreenLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadDashboard().catch(() => undefined);
  }, [loadDashboard]);

  useEffect(() => {
    if (loading || !user) return;

    refreshChatUnread().catch(() => undefined);

    const interval = setInterval(() => {
      refreshChatUnread().catch(() => undefined);
    }, 30000);

    return () => clearInterval(interval);
  }, [loading, user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;

      refreshChatUnread().catch(() => undefined);
    }, [user?.id]),
  );

  useEffect(() => {
    const handleChatOpened = (data: { withUserId: number }): void => {
      activeChatUserIdRef.current = data.withUserId;
    };

    const handleChatClosed = (): void => {
      activeChatUserIdRef.current = null;
    };

    const handleNewMessage = (data: {
      senderId: number;
      content: string;
      timestamp: string;
    }): void => {
      if (data.senderId === user?.id) return;
      if (activeChatUserIdRef.current === data.senderId) return;

      setUnreadCount((prev) => prev + 1);
    };

    const handleMessagesRead = (): void => {
      setUnreadCount(0);
    };

    chatEvents.on(CHAT_EVENTS.CHAT_OPENED, handleChatOpened);
    chatEvents.on(CHAT_EVENTS.CHAT_CLOSED, handleChatClosed);
    chatEvents.on(CHAT_EVENTS.NEW_MESSAGE, handleNewMessage);
    chatEvents.on(CHAT_EVENTS.MESSAGES_READ, handleMessagesRead);

    return () => {
      chatEvents.off(CHAT_EVENTS.CHAT_OPENED, handleChatOpened);
      chatEvents.off(CHAT_EVENTS.CHAT_CLOSED, handleChatClosed);
      chatEvents.off(CHAT_EVENTS.NEW_MESSAGE, handleNewMessage);
      chatEvents.off(CHAT_EVENTS.MESSAGES_READ, handleMessagesRead);
    };
  }, [user?.id]);

  const onRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, [loadDashboard]);

  const firstName = user?.fullName?.split(" ")[0] ?? "";
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

  const nextMed = useMemo(
    () => getNextMedication(medications.filter((m) => m.isActive)),
    [medications],
  );

  const shouldShowAlert =
    lastPrediction !== null && lastPrediction.riskLevel !== "LOW";

  if (screenLoading) {
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
        <View style={styles.headerBackground}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Avatar
                  photoUrl={user?.photoUrl ?? null}
                  name={user?.fullName ?? firstName}
                  size={52}
                  style={styles.avatar}
                />
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
        </View>

        <View style={styles.content}>
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
              />
            }
            contentContainerStyle={styles.scrollContent}
          >
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

            {nextMed ? (
              (() => {
                const desc = getTimeDescription(
                  nextMed.minutesFromNow,
                  nextMed.time,
                  nextMed.isToday,
                  i18n.language,
                );

                return (
                  <View style={styles.card}>
                    <Text style={styles.cardLabel}>
                      {t("dashboard.nextMedication")}
                    </Text>
                    <View style={styles.medRow}>
                      <View
                        style={[
                          styles.medIconWrapper,
                          { backgroundColor: `${desc.color}15` },
                        ]}
                      >
                        <Text style={styles.medEmoji}>💊</Text>
                      </View>

                      <View style={styles.medInfo}>
                        <Text style={styles.medName}>
                          {nextMed.med.drugName}
                        </Text>
                        <Text style={styles.medDosage}>
                          {nextMed.med.dosage} · {nextMed.med.frequency}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.timeBadge,
                          {
                            backgroundColor: `${desc.color}15`,
                            borderColor: `${desc.color}40`,
                          },
                        ]}
                      >
                        {desc.urgency === "now" ? (
                          <Ionicons
                            name="alert-circle"
                            size={12}
                            color={desc.color}
                          />
                        ) : null}
                        {desc.urgency === "soon" ? (
                          <Ionicons
                            name="time-outline"
                            size={12}
                            color={desc.color}
                          />
                        ) : null}
                        {desc.urgency === "later" ? (
                          <Ionicons
                            name="alarm-outline"
                            size={12}
                            color={desc.color}
                          />
                        ) : null}
                        {desc.urgency === "tomorrow" ? (
                          <Ionicons
                            name="calendar-outline"
                            size={12}
                            color={desc.color}
                          />
                        ) : null}
                        <Text
                          style={[styles.timeBadgeText, { color: desc.color }]}
                        >
                          {desc.label}
                        </Text>
                      </View>
                    </View>

                    {desc.urgency === "tomorrow" ? (
                      <Text style={styles.tomorrowNote}>
                        {t("dashboard.allMedsDoneToday")}
                      </Text>
                    ) : null}

                    {desc.urgency === "now" ? (
                      <TouchableOpacity
                        style={styles.takeMedButton}
                        onPress={() => navigation.navigate("Medications")}
                      >
                        <Text style={styles.takeMedText}>
                          {t("dashboard.takeMedication")}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color={COLORS.danger}
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })()
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>
                  {t("dashboard.nextMedication")}
                </Text>
                <View style={styles.noMedRow}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={COLORS.success}
                  />
                  <Text style={styles.noMedText}>
                    {t("medications.noMedications")}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.reportButton}
              onPress={() => navigation.navigate("Reports")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="bar-chart-outline"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.reportButtonText}>
                {t("dashboard.viewReport")}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      <NotificationPanel
        visible={showNotifications}
        notifications={notifications}
        language={i18n.language}
        onClose={() => setShowNotifications(false)}
        onUpdate={(updated) => {
          setNotifications(updated);
          setUnreadCount(
            updated.filter((notification) => !notification.isRead).length,
          );
        }}
      />
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
  scroll: {
    flex: 1,
  },
  headerBackground: {
    backgroundColor: COLORS.primary,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 28,
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
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  scrollContent: {
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
  medRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  medIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.primary}10`,
    alignItems: "center",
    justifyContent: "center",
  },
  medEmoji: { fontSize: 22 },
  medInfo: { flex: 1 },
  medName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  medDosage: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  timeBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  tomorrowNote: {
    fontSize: 12,
    color: COLORS.success,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    fontStyle: "italic",
  },
  takeMedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  takeMedText: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: "700",
  },
  noMedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  noMedText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  reportButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
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
