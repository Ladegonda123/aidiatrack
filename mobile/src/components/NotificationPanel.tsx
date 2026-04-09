import React from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { COLORS } from "../utils/colors";
import { timeAgo } from "../utils/formatters";
import { AppNotification } from "../api/notificationAPI";

interface NotificationPanelProps {
  visible: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  onClose: () => void;
  onMarkAllRead: () => Promise<void>;
  onNotificationPress?: (notification: AppNotification) => void;
}

const iconMap: Record<AppNotification["type"], string> = {
  chat: "💬",
  medication: "💊",
  bg_alert: "⚠️",
  system: "ℹ️",
};

const NotificationPanel = ({
  visible,
  notifications,
  unreadCount,
  onClose,
  onMarkAllRead,
  onNotificationPress,
}: NotificationPanelProps): React.JSX.Element => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as "en" | "rw";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.title}>{t("notifications.panelTitle")}</Text>
              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount.toString()}
                  </Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => {
                onMarkAllRead().catch(() => undefined);
              }}
              disabled={notifications.length === 0}
            >
              <Text style={styles.markReadText}>
                {t("notifications.markAllRead")}
              </Text>
            </TouchableOpacity>
          </View>

          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyText}>{t("notifications.empty")}</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.item, !item.isRead && styles.itemUnread]}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (onNotificationPress) {
                      onNotificationPress(item);
                    } else {
                      onClose();
                    }
                  }}
                >
                  <Text style={styles.itemIcon}>{iconMap[item.type]}</Text>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemBody}>{item.body}</Text>
                    <Text style={styles.itemTime}>
                      {timeAgo(item.createdAt, lang)}
                    </Text>
                  </View>
                  {!item.isRead ? <View style={styles.unreadDot} /> : null}
                </TouchableOpacity>
              )}
            />
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  panel: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    maxHeight: "75%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  markReadText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 12,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  itemUnread: {
    backgroundColor: `${COLORS.primary}08`,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  itemIcon: {
    fontSize: 24,
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  itemBody: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  itemTime: {
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
  closeButton: {
    paddingVertical: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 8,
  },
  closeText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
});

export default NotificationPanel;
