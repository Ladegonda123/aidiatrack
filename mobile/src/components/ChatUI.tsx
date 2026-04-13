import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import axiosInstance from "../api/axiosInstance";
import { getMessages, sendMessage, markMessagesRead } from "../api/chatAPI";
import { useSocket } from "../context/SocketContext";
import { COLORS } from "../utils/colors";
import { formatDate, formatTime, timeAgo } from "../utils/formatters";
import { Message } from "../types";
import Avatar from "./Avatar";

interface ChatUIProps {
  currentUserId: number;
  otherUserId: number;
  otherUserName: string;
  otherUserPhotoUrl?: string | null;
  onBack?: () => void;
  useBottomSafeArea?: boolean;
  /** Pixels already offset below the content area (e.g. tab bar height).
   *  Subtracted from the Android keyboard height so the body isn't over-pushed. */
  keyboardOffset?: number;
}

interface PresenceResponse {
  userId: number;
  online: boolean;
  lastSeen: string | null;
}

interface ApiResponse<T> {
  data: T;
}

const getChatRoomId = (idA: number, idB: number): string => {
  const [a, b] = [idA, idB].sort((x, y) => x - y);
  return `chat_${a}_${b}`;
};

const shouldShowDateSeparator = (
  messages: Message[],
  index: number,
): boolean => {
  if (index === 0) return true;
  try {
    const current = new Date(messages[index].sentAt);
    const previous = new Date(messages[index - 1].sentAt);
    if (isNaN(current.getTime()) || isNaN(previous.getTime())) {
      return false;
    }
    return current.toDateString() !== previous.toDateString();
  } catch {
    return false;
  }
};

const ChatUI = ({
  currentUserId,
  otherUserId,
  otherUserName,
  otherUserPhotoUrl,
  onBack,
  useBottomSafeArea = false,
  keyboardOffset = 0,
}: ChatUIProps): React.JSX.Element => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [firstUnreadIndex, setFirstUnreadIndex] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOtherOnline, setIsOtherOnline] = useState<boolean>(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList<Message>>(null);
  const { socket } = useSocket();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const roomId = getChatRoomId(currentUserId, otherUserId);

  const getDateLabel = useCallback(
    (dateStr: string | undefined, _language: string): string => {
      if (!dateStr) return "";
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "";
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
          return t("chat.today");
        }

        if (date.toDateString() === yesterday.toDateString()) {
          return t("chat.yesterday");
        }

        return formatDate(dateStr, i18n.language as "en" | "rw");
      } catch {
        return "";
      }
    },
    [i18n.language, t],
  );

  const loadMessages = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await getMessages(otherUserId);
      const msgs = Array.isArray(data) ? data : [];

      const unreadMsgs = msgs.filter(
        (message) => message.senderId !== currentUserId && !message.isRead,
      );
      const count = unreadMsgs.length;

      if (count > 0) {
        const firstUnread = msgs.findIndex(
          (message) => message.senderId !== currentUserId && !message.isRead,
        );
        setFirstUnreadIndex(firstUnread);
        setUnreadCount(count);
      } else {
        setFirstUnreadIndex(null);
        setUnreadCount(0);
      }

      setMessages(msgs);
      await markMessagesRead(otherUserId);
    } catch {
      setMessages([]);
      setFirstUnreadIndex(null);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, otherUserId]);

  useEffect(() => {
    loadMessages().catch(() => {
      setLoading(false);
    });
  }, [loadMessages]);

  useEffect(() => {
    const fetchPresence = async (): Promise<void> => {
      try {
        const response = await axiosInstance.get<ApiResponse<PresenceResponse>>(
          `/chat/presence/${otherUserId}`,
        );
        const data = response.data?.data;
        setIsOtherOnline(data?.online ?? false);
        setLastSeen(data?.lastSeen ?? null);
      } catch {
        setIsOtherOnline(false);
        setLastSeen(null);
      }
    };

    fetchPresence().catch(() => {
      setIsOtherOnline(false);
      setLastSeen(null);
    });
  }, [otherUserId]);

  useEffect(() => {
    if (!socket) return;

    socket.emit("join_room", { roomId });
    socket.emit("authenticate", currentUserId);

    const handleReceive = (data: {
      message?: string;
      content?: string;
      senderId: number;
      timestamp?: string;
      sentAt?: string;
    }): void => {
      if (data.senderId === currentUserId) return;

      // Handle both field names from socket
      const content = data.message ?? data.content ?? "";
      if (!content) return; // skip empty messages

      // Handle both 'timestamp' and 'sentAt' field names
      // and fallback to current time if neither exist
      const sentAt = data.timestamp ?? data.sentAt ?? new Date().toISOString();

      const newMessage: Message = {
        id: Date.now(),
        senderId: data.senderId,
        receiverId: currentUserId,
        content, // ← correctly mapped
        isRead: false,
        sentAt,
      };

      setMessages((prev) => [...prev, newMessage]);
      markMessagesRead(otherUserId).catch(() => {
        // Silent fail; read status sync is best-effort.
      });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    socket.on("receive_message", handleReceive);

    return () => {
      socket.off("receive_message", handleReceive);
    };
  }, [socket, roomId, currentUserId]);

  useEffect(() => {
    if (!socket) return;

    const handleOnline = (data: { userId: number }): void => {
      if (data.userId === otherUserId) {
        setIsOtherOnline(true);
        setLastSeen(null);
      }
    };

    const handleOffline = (data: {
      userId: number;
      lastSeen: string;
    }): void => {
      if (data.userId === otherUserId) {
        setIsOtherOnline(false);
        setLastSeen(data.lastSeen);
      }
    };

    socket.on("user_online", handleOnline);
    socket.on("user_offline", handleOffline);

    return () => {
      socket.off("user_online", handleOnline);
      socket.off("user_offline", handleOffline);
    };
  }, [socket, otherUserId]);

  useEffect(() => {
    if (
      !loading &&
      firstUnreadIndex !== null &&
      firstUnreadIndex > 0 &&
      messages.length > 0
    ) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: firstUnreadIndex,
          animated: true,
          viewPosition: 0.3,
        });
      }, 300);
      return;
    }

    if (!loading && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [firstUnreadIndex, loading, messages.length]);

  // Android + edge-to-edge: apply keyboard height directly as marginBottom on
  // the body so the input bar lifts above the keyboard. KAV is not used because
  // edgeToEdgeEnabled=true leaves residual gaps on dismiss.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      setAndroidKeyboardHeight(
        Math.max(0, e.endCoordinates.height - keyboardOffset),
      );
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setAndroidKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [keyboardOffset]);

  const handleSend = useCallback(async (): Promise<void> => {
    const text = inputText.trim();
    if (!text || sending) return;

    const optimistic: Message = {
      id: Date.now(),
      senderId: currentUserId,
      receiverId: otherUserId,
      content: text,
      isRead: false,
      sentAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setInputText("");

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      setSending(true);
      await sendMessage(otherUserId, text);
    } catch {
      setMessages((prev) =>
        prev.filter((message) => message.id !== optimistic.id),
      );
      setInputText(text);
    } finally {
      setSending(false);
    }
  }, [currentUserId, inputText, otherUserId, sending]);

  const chatContent = (
    <View style={styles.container}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <View style={styles.headerInfo}>
          <View style={styles.avatarSmallWrapper}>
            <Avatar
              photoUrl={otherUserPhotoUrl}
              name={otherUserName}
              size={36}
              style={styles.avatarSmall}
            />
            {isOtherOnline && <View style={styles.onlineDot} />}
          </View>
          <View>
            <Text style={styles.headerName}>{otherUserName}</Text>
            <Text
              style={[
                styles.headerOnline,
                {
                  color: isOtherOnline ? "#90EE90" : "rgba(255,255,255,0.7)",
                },
              ]}
            >
              {isOtherOnline
                ? t("chat.online")
                : lastSeen
                  ? `${t("chat.lastSeen")} ${timeAgo(lastSeen, i18n.language as "en" | "rw")}`
                  : t("chat.offline")}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.body,
          androidKeyboardHeight > 0 && { marginBottom: androidKeyboardHeight },
        ]}
      >
        <View style={styles.messagesArea}>
          {loading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={styles.loader}
            />
          ) : messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>??</Text>
              <Text style={styles.emptyText}>{t("chat.noMessages")}</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, index) => `${item.id}_${index}`}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  flatListRef.current?.scrollToIndex({
                    index: info.index,
                    animated: true,
                  });
                }, 500);
              }}
              renderItem={({ item, index }) => {
                const isMine = item.senderId === currentUserId;
                const showSeparator = shouldShowDateSeparator(messages, index);
                const showUnreadDivider =
                  firstUnreadIndex !== null &&
                  index === firstUnreadIndex &&
                  unreadCount > 0;

                const unreadLabel =
                  unreadCount === 1
                    ? t("chat.unreadSingle")
                    : t("chat.unreadMany", { count: unreadCount });

                return (
                  <>
                    {showSeparator && (
                      <View style={styles.dateSeparator}>
                        <View style={styles.dateLine} />
                        <Text style={styles.dateLabel}>
                          {item.sentAt
                            ? getDateLabel(item.sentAt, i18n.language)
                            : ""}
                        </Text>
                        <View style={styles.dateLine} />
                      </View>
                    )}

                    {showUnreadDivider ? (
                      <View style={styles.unreadDivider}>
                        <View style={styles.unreadDividerLine} />
                        <View style={styles.unreadDividerBadge}>
                          <Text style={styles.unreadDividerText}>
                            {unreadLabel}
                          </Text>
                        </View>
                        <View style={styles.unreadDividerLine} />
                      </View>
                    ) : null}

                    <View
                      style={[
                        styles.messageRow,
                        isMine ? styles.messageRowMine : styles.messageRowOther,
                      ]}
                    >
                      {!isMine && (
                        <Avatar
                          photoUrl={otherUserPhotoUrl}
                          name={otherUserName}
                          size={28}
                          style={styles.messageAvatar}
                        />
                      )}
                      <View
                        style={[
                          styles.bubble,
                          isMine ? styles.bubbleMine : styles.bubbleOther,
                        ]}
                      >
                        <Text
                          style={[
                            styles.bubbleText,
                            isMine
                              ? styles.bubbleTextMine
                              : styles.bubbleTextOther,
                          ]}
                        >
                          {item.content}
                        </Text>
                        <View style={styles.bubbleTimeRow}>
                          <Text
                            style={[
                              styles.bubbleTime,
                              isMine
                                ? styles.bubbleTimeMine
                                : styles.bubbleTimeOther,
                            ]}
                          >
                            {item.sentAt ? formatTime(item.sentAt) : ""}
                          </Text>
                          {isMine && (
                            <Ionicons
                              name="checkmark-outline"
                              size={12}
                              color="rgba(255,255,255,0.7)"
                            />
                          )}
                        </View>
                      </View>
                    </View>
                  </>
                );
              }}
            />
          )}
        </View>

        <View
          style={[
            styles.inputBar,
            useBottomSafeArea && {
              paddingBottom: 8 + insets.bottom,
            },
          ]}
        >
          <TextInput
            style={styles.messageInput}
            placeholder={t("chat.messagePlaceholder")}
            placeholderTextColor={COLORS.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {Platform.OS === "ios" ? (
        // iOS: KAV with "padding" reliably lifts content above the keyboard.
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          {chatContent}
        </KeyboardAvoidingView>
      ) : (
        // Android: keyboard height is tracked via Keyboard listeners and applied
        // as marginBottom on the body view inside chatContent. KAV is not used
        // because edgeToEdgeEnabled=true causes residual gaps on dismiss.
        <View style={styles.keyboardContainer}>{chatContent}</View>
      )}
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
  keyboardContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 18,
    gap: 12,
  },
  backButton: { padding: 4 },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatarSmallWrapper: { position: "relative" },
  avatarSmall: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  headerName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  headerOnline: {
    fontSize: 12,
  },
  body: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  messagesArea: {
    flex: 1,
  },
  loader: { flex: 1, justifyContent: "center" },
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
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 10,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dateLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  unreadDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    paddingHorizontal: 8,
    gap: 8,
  },
  unreadDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: `${COLORS.warning}60`,
  },
  unreadDividerBadge: {
    backgroundColor: `${COLORS.warning}20`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${COLORS.warning}60`,
  },
  unreadDividerText: {
    fontSize: 12,
    color: COLORS.warning,
    fontWeight: "600",
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 2,
    alignItems: "flex-end",
    gap: 6,
  },
  messageRowMine: { justifyContent: "flex-end" },
  messageRowOther: { justifyContent: "flex-start" },
  messageAvatar: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMine: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  bubbleTextMine: { color: "#FFFFFF" },
  bubbleTextOther: { color: COLORS.textPrimary },
  bubbleTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
    marginTop: 4,
  },
  bubbleTime: {
    fontSize: 10,
    textAlign: "right",
  },
  bubbleTimeMine: { color: "rgba(255,255,255,0.7)" },
  bubbleTimeOther: { color: COLORS.textSecondary },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 6,
  },
  messageInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    backgroundColor: COLORS.background,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.5,
  },
});

export default ChatUI;
