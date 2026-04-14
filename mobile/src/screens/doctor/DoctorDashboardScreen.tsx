import React, {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getMyPatients } from "../../api/doctorAPI";
import Avatar from "../../components/Avatar";
import { COLORS, getBgColor, getRiskColor } from "../../utils/colors";
import { timeAgo } from "../../utils/formatters";
import { useAuth } from "../../hooks/useAuth";
import NotificationPanel from "../../components/NotificationPanel";
import { AppNotification, getNotifications } from "../../api/notificationAPI";
import { RootStackParamList, PatientWithChat } from "../../types";

type DashboardPatient = PatientWithChat;

const DoctorDashboardScreen = (): React.JSX.Element => {
  const { t, i18n } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, refreshChatUnread, loading } = useAuth();
  const [patients, setPatients] = useState<DashboardPatient[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [screenLoading, setScreenLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadPatients = useCallback(async (): Promise<void> => {
    try {
      setScreenLoading(true);
      const list = await getMyPatients();
      setPatients(list);
    } catch {
      setPatients([]);
    } finally {
      setScreenLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async (): Promise<void> => {
    try {
      const notifData = await getNotifications();
      setNotifications(notifData.notifications);
      setUnreadCount(notifData.unreadCount);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    loadPatients().catch(() => {
      setScreenLoading(false);
    });
    loadNotifications().catch(() => undefined);
  }, [loadNotifications, loadPatients]);

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

      // Refresh notification bell so unread count is accurate after
      // navigating back from another screen (events missed while unmounted).
      loadNotifications().catch(() => undefined);
    }, [user?.id]),
  );

  const filteredPatients = patients.filter(
    (patient) =>
      patient.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const onRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await loadPatients();
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications, loadPatients]);

  const highRiskCount = patients.filter(
    (patient) => patient.lastPrediction?.riskLevel === "HIGH",
  ).length;
  const mediumRiskCount = patients.filter(
    (patient) => patient.lastPrediction?.riskLevel === "MEDIUM",
  ).length;
  const lowRiskCount = patients.filter(
    (patient) =>
      patient.lastPrediction?.riskLevel === "LOW" || !patient.lastPrediction,
  ).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Avatar
                photoUrl={user?.photoUrl ?? null}
                name={user?.fullName ?? "Doctor"}
                size={42}
                style={styles.avatar}
              />
              <View>
                <Text style={styles.greeting}>
                  {t("doctor.dashboard.greeting")}
                </Text>
                <Text style={styles.subGreeting}>
                  {patients.length} {t("doctor.dashboard.patientsCount")}
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
              {unreadCount > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount.toString()}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>

          <View style={styles.searchBar}>
            <Ionicons
              name="search-outline"
              size={16}
              color={COLORS.textSecondary}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={t("doctor.dashboard.searchPlaceholder")}
              placeholderTextColor="rgba(255,255,255,0.72)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{patients.length}</Text>
              <Text style={styles.statLabel}>
                {t("doctor.dashboard.totalPatients")}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.danger }]}>
                {highRiskCount}
              </Text>
              <Text style={styles.statLabel}>
                {t("doctor.dashboard.highRisk")}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.warning }]}>
                {mediumRiskCount}
              </Text>
              <Text style={styles.statLabel}>
                {t("doctor.dashboard.mediumRisk")}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.success }]}>
                {lowRiskCount}
              </Text>
              <Text style={styles.statLabel}>
                {t("doctor.dashboard.lowRisk")}
              </Text>
            </View>
          </View>

          {screenLoading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={styles.loader}
            />
          ) : filteredPatients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? t("doctor.dashboard.noResults")
                  : t("doctor.dashboard.noPatients")}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredPatients}
              keyExtractor={(item) => item.id.toString()}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    onRefresh().catch(() => undefined);
                  }}
                  colors={[COLORS.primary]}
                />
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const lastBg = item.lastHealthRecord?.bloodGlucose;
                const riskLevel = item.lastPrediction?.riskLevel;
                const bgColor = lastBg
                  ? getBgColor(lastBg)
                  : COLORS.textSecondary;
                const rColor = riskLevel
                  ? getRiskColor(riskLevel)
                  : COLORS.textSecondary;

                return (
                  <TouchableOpacity
                    style={styles.patientCard}
                    onPress={() => {
                      navigation.navigate("PatientDetail", {
                        patientId: item.id,
                        patientName: item.fullName,
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.patientLeft}>
                      <Avatar
                        photoUrl={item.photoUrl ?? null}
                        name={item.fullName}
                        size={46}
                        style={styles.patientAvatarStyle}
                      />
                      <View style={styles.patientInfo}>
                        <Text style={styles.patientName}>{item.fullName}</Text>
                        <Text style={styles.patientPhone}>
                          {item.phone ?? item.email}
                        </Text>
                        {item.lastHealthRecord ? (
                          <Text style={styles.lastSeen}>
                            {t("doctor.dashboard.lastReading")}:{" "}
                            {timeAgo(
                              item.lastHealthRecord.recordedAt,
                              i18n.language as "en" | "rw",
                            )}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.patientRight}>
                      {lastBg ? (
                        <Text style={[styles.bgValue, { color: bgColor }]}>
                          {lastBg.toFixed(0)}
                          <Text style={styles.bgUnit}> mg/dL</Text>
                        </Text>
                      ) : (
                        <Text style={styles.noData}>--</Text>
                      )}

                      {riskLevel ? (
                        <View
                          style={[
                            styles.riskBadge,
                            { backgroundColor: `${rColor}20` },
                          ]}
                        >
                          <View
                            style={[
                              styles.riskDot,
                              { backgroundColor: rColor },
                            ]}
                          />
                          <Text style={[styles.riskText, { color: rColor }]}>
                            {riskLevel}
                          </Text>
                        </View>
                      ) : null}
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={COLORS.textSecondary}
                        style={{ marginTop: 4 }}
                      />
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
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
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
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
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  greeting: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  subGreeting: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 1,
  },
  bellButton: { padding: 4 },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
    padding: 0,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  loader: { marginTop: 40 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyIcon: { fontSize: 48 },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 10,
  },
  patientCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  patientLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  patientInfo: { flex: 1 },
  patientName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  patientPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  lastSeen: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  patientAvatarStyle: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  patientRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  bgValue: {
    fontWeight: "400",
  },
  bgUnit: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  noData: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  riskDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  riskText: {
    fontSize: 10,
    fontWeight: "700",
  },
});

export default DoctorDashboardScreen;
