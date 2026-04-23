import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  AppNotification,
  markOneRead,
  markAllRead,
  deleteNotification,
  deleteAllNotifications,
} from "../api/notificationAPI";
import { COLORS } from "../utils/colors";
import { timeAgo } from "../utils/formatters";

interface Props {
  visible: boolean;
  notifications: AppNotification[];
  onClose: () => void;
  onUpdate: (updated: AppNotification[]) => void;
  language: string;
}

const TYPE_CONFIG: Record<
  string,
  {
    icon: string;
    color: string;
    bgColor: string;
  }
> = {
  medication: {
    icon: "medical-outline",
    color: COLORS.primary,
    bgColor: `${COLORS.primary}15`,
  },
  bg_alert: {
    icon: "warning-outline",
    color: COLORS.danger,
    bgColor: `${COLORS.danger}15`,
  },
  chat: {
    icon: "chatbubble-outline",
    color: COLORS.success,
    bgColor: `${COLORS.success}15`,
  },
  system: {
    icon: "information-circle-outline",
    color: COLORS.textSecondary,
    bgColor: COLORS.border,
  },
};

const NotificationPanel: React.FC<Props> = ({
  visible,
  notifications,
  onClose,
  onUpdate,
  language,
}) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  const handleMarkOneRead = async (notif: AppNotification): Promise<void> => {
    if (notif.isRead) return;

    await markOneRead(notif.id);
    onUpdate(
      notifications.map((n) =>
        n.id === notif.id ? { ...n, isRead: true } : n,
      ),
    );
  };

  const handleMarkAllRead = async (): Promise<void> => {
    await markAllRead();
    onUpdate(notifications.map((n) => ({ ...n, isRead: true })));
  };

  const handleDeleteOne = async (id: number): Promise<void> => {
    await deleteNotification(id);
    onUpdate(notifications.filter((n) => n.id !== id));
  };

  const handleDeleteAll = (): void => {
    Alert.alert(
      t("notifications.deleteAllTitle") || "Delete All",
      t("notifications.deleteAllConfirm") ||
        "Delete all notifications?",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("notifications.deleteAll") || "Delete All",
          style: "destructive",
          onPress: async () => {
            await deleteAllNotifications();
            onUpdate([]);
          },
        },
      ],
    );
  };

  const handleNavigate = (notif: AppNotification): void => {
    void handleMarkOneRead(notif);
    onClose();

    switch (notif.type) {
      case "chat":
        navigation.navigate("PatientTabs", { screen: "Chat" });
        break;
      case "bg_alert":
        navigation.navigate("PatientTabs", { screen: "Predictions" });
        break;
      case "medication":
        navigation.navigate("Medications");
        break;
      default:
        break;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.panel}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>{t("notifications.panelTitle")}</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>

            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    void handleMarkAllRead();
                  }}
                >
                  <Ionicons
                    name="checkmark-done-outline"
                    size={18}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>
              )}
              {notifications.length > 0 && (
                <TouchableOpacity style={styles.actionBtn} onPress={handleDeleteAll}>
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={COLORS.danger}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {(unreadCount > 0 || notifications.length > 0) && (
            <View style={styles.actionLabels}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    void handleMarkAllRead();
                  }}
                >
                  <Text style={styles.markReadText}>
                    {t("notifications.markAllRead")}
                  </Text>
                </TouchableOpacity>
              )}
              {notifications.length > 0 && (
                <TouchableOpacity onPress={handleDeleteAll}>
                  <Text style={styles.deleteAllText}>
                    {t("notifications.deleteAll") || "Delete All"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {notifications.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name="notifications-off-outline"
                  size={40}
                  color={COLORS.textSecondary}
                />
              </View>
              <Text style={styles.emptyText}>{t("notifications.empty")}</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.system;

                return (
                  <TouchableOpacity
                    style={[styles.item, !item.isRead && styles.itemUnread]}
                    onPress={() => handleNavigate(item)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: config.bgColor },
                      ]}
                    >
                      <Ionicons
                        name={config.icon as any}
                        size={20}
                        color={config.color}
                      />
                    </View>

                    <View style={styles.itemContent}>
                      <Text
                        style={[
                          styles.itemTitle,
                          !item.isRead && styles.itemTitleUnread,
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.itemBody} numberOfLines={2}>
                        {item.body}
                      </Text>
                      <Text style={styles.itemTime}>
                        {timeAgo(item.createdAt, language as "en" | "rw")}
                      </Text>
                    </View>

                    <View style={styles.itemRight}>
                      {!item.isRead && <View style={styles.unreadDot} />}

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => {
                          void handleDeleteOne(item.id);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name="close"
                          size={16}
                          color={COLORS.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  panel: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: "80%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  markReadText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
  },
  deleteAllText: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: "600",
  },
  list: {
    paddingVertical: 8,
    paddingBottom: 16,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 14,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  itemUnread: {
    backgroundColor: `${COLORS.primary}06`,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    gap: 3,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  itemTitleUnread: {
    fontWeight: "700",
  },
  itemBody: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  itemTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  itemRight: {
    alignItems: "center",
    gap: 8,
    paddingTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  deleteBtn: {
    padding: 2,
  },
  closeBtn: {
    paddingVertical: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 4,
  },
  closeBtnText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
});

export default NotificationPanel;
