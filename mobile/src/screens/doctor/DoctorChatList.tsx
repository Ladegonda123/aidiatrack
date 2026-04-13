import React, {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getMyPatients } from "../../api/doctorAPI";
import Avatar from "../../components/Avatar";
import { COLORS } from "../../utils/colors";
import { RootStackParamList, PatientWithChat } from "../../types";
import { useAuth } from "../../hooks/useAuth";

const formatChatTime = (
  dateStr: string,
  language: "en" | "rw",
  yesterdayLabel: string,
): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (date >= today) {
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  if (date >= yesterday) {
    return yesterdayLabel;
  }

  const locale = language === "rw" ? "rw-RW" : "en-US";
  if (date >= weekAgo) {
    return date.toLocaleDateString(locale, { weekday: "short" });
  }

  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
};

const DoctorChatList = (): React.JSX.Element => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [patients, setPatients] = useState<PatientWithChat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadPatients = useCallback(async (): Promise<void> => {
    try {
      const list = await getMyPatients();
      setPatients(list);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients().catch(() => {
      setLoading(false);
    });
  }, [loadPatients]);

  useFocusEffect(
    useCallback(() => {
      loadPatients().catch(() => {
        setLoading(false);
      });
    }, [loadPatients]),
  );

  const onRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await loadPatients();
    setRefreshing(false);
  }, [loadPatients]);

  const totalUnread = patients.reduce(
    (sum, patient) => sum + (patient.unreadCount ?? 0),
    0,
  );
  const language = i18n.language === "rw" ? "rw" : "en";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>{t("chat.titleDoctor")}</Text>
            {totalUnread > 0 ? (
              <View style={styles.totalUnreadBadge}>
                <Text style={styles.totalUnreadText}>{totalUnread}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={styles.loader}
            />
          ) : patients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>
                {t("doctor.dashboard.noPatients")}
              </Text>
            </View>
          ) : (
            <FlatList
              data={patients}
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
              renderItem={({ item }) => {
                const hasUnread = (item.unreadCount ?? 0) > 0;
                const isMyMessage = item.lastMessage?.senderId === user?.id;
                const preview = item.lastMessage
                  ? isMyMessage
                    ? `${t("chat.youPrefix")}: ${item.lastMessage.content}`
                    : item.lastMessage.content
                  : item.email;

                return (
                  <TouchableOpacity
                    style={styles.chatRow}
                    onPress={() => {
                      navigation.navigate("DoctorChat", {
                        patientId: item.id,
                        patientName: item.fullName,
                        patientPhotoUrl: item.photoUrl ?? null,
                      });
                    }}
                    activeOpacity={0.6}
                  >
                    <View style={styles.avatarWrapper}>
                      <Avatar
                        photoUrl={item.photoUrl ?? null}
                        name={item.fullName}
                        size={52}
                      />
                    </View>

                    <View style={styles.chatInfo}>
                      <View style={styles.chatTopRow}>
                        <Text
                          style={[
                            styles.patientName,
                            hasUnread ? styles.patientNameUnread : null,
                          ]}
                          numberOfLines={1}
                        >
                          {item.fullName}
                        </Text>
                        {item.lastMessage ? (
                          <Text
                            style={[
                              styles.timeText,
                              hasUnread ? styles.timeTextUnread : null,
                            ]}
                          >
                            {formatChatTime(
                              item.lastMessage.sentAt,
                              language,
                              t("chat.yesterday"),
                            )}
                          </Text>
                        ) : null}
                      </View>

                      <View style={styles.chatBottomRow}>
                        <Text
                          style={[
                            styles.lastMessage,
                            hasUnread ? styles.lastMessageUnread : null,
                          ]}
                          numberOfLines={1}
                        >
                          {preview}
                        </Text>

                        {hasUnread ? (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>
                              {item.unreadCount > 99
                                ? "99+"
                                : item.unreadCount.toString()}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>
      </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  totalUnreadBadge: {
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  totalUnreadText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
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
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    gap: 12,
  },
  avatarWrapper: {
    position: "relative",
    flexShrink: 0,
  },
  chatInfo: {
    flex: 1,
    gap: 4,
  },
  chatTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  patientName: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.textPrimary,
    flex: 1,
  },
  patientNameUnread: {
    fontWeight: "700",
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  timeTextUnread: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  chatBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  lastMessageUnread: {
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 80,
  },
});

export default DoctorChatList;
