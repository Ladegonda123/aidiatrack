import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import axiosInstance from "../api/axiosInstance";
import { getMessages, sendMessage } from "../api/chatAPI";
import { useSocket } from "../context/SocketContext";
import { COLORS } from "../utils/colors";
import { formatDate, formatTime, timeAgo } from "../utils/formatters";
import { Message } from "../types";

interface ChatUIProps {
  currentUserId: number;
  otherUserId: number;
  otherUserName: string;
  otherUserPhotoUrl?: string | null;
  onBack?: () => void;
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
  const current = new Date(messages[index].sentAt);
  const previous = new Date(messages[index - 1].sentAt);
  return current.toDateString() !== previous.toDateString();
};

const ChatUI = ({
  currentUserId,
  otherUserId,
  otherUserName,
  onBack,
}: ChatUIProps): React.JSX.Element => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [isOtherOnline, setIsOtherOnline] = useState<boolean>(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);
  const insets = useSafeAreaInsets();
  const { socket } = useSocket();
  const { t, i18n } = useTranslation();
  const roomId = getChatRoomId(currentUserId, otherUserId);

  const getDateLabel = useCallback(
    (dateStr: string, _language: string): string => {
      const date = new Date(dateStr);
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
    },
    [i18n.language, t],
  );

  const loadMessages = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await getMessages(otherUserId);
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [otherUserId]);

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
      message: string;
      senderId: number;
      timestamp: string;
    }): void => {
      if (data.senderId === currentUserId) return;

      const newMessage: Message = {
        id: Date.now(),
        senderId: data.senderId,
        receiverId: currentUserId,
        content: data.message,
        isRead: false,
        sentAt: data.timestamp,
      };

      setMessages((prev) => [...prev, newMessage]);
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
    if (messages.length > 0 && !loading) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messages.length, loading]);

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

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}

        <View style={styles.headerInfo}>
          <View style={styles.avatarSmallWrapper}>
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarSmallText}>
                {otherUserName.charAt(0).toUpperCase()}
              </Text>
            </View>
            {isOtherOnline ? <View style={styles.onlineDot} /> : null}
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
                ? (t("chat.online") ?? "Active now")
                : lastSeen
                  ? `${t("chat.lastSeen")} ${timeAgo(lastSeen, i18n.language as "en" | "rw")}`
                  : t("chat.offline")}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.messagesArea}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={styles.loader}
          />
        ) : messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>{t("chat.noMessages")}</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => `${item.id}_${index}`}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            onLayout={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            renderItem={({ item, index }) => {
              const isMine = item.senderId === currentUserId;
              const showSeparator = shouldShowDateSeparator(messages, index);
              return (
                <>
                  {showSeparator && (
                    <View style={styles.dateSeparator}>
                      <View style={styles.dateLine} />
                      <Text style={styles.dateLabel}>
                        {getDateLabel(item.sentAt, i18n.language)}
                      </Text>
                      <View style={styles.dateLine} />
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageRow,
                      isMine ? styles.messageRowMine : styles.messageRowOther,
                    ]}
                  >
                    {!isMine && (
                      <View style={styles.messageAvatar}>
                        <Text style={styles.messageAvatarText}>
                          {otherUserName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
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
                      <Text
                        style={[
                          styles.bubbleTime,
                          isMine
                            ? styles.bubbleTimeMine
                            : styles.bubbleTimeOther,
                        ]}
                      >
                        {formatTime(item.sentAt)}
                        {isMine && " ✓"}
                      </Text>
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
          { paddingBottom: Math.max(insets.bottom, 16) },
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
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
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
  avatarSmallText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  headerName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  headerOnline: {
    fontSize: 12,
  },
  messagesArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
  },
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
  messageRow: {
    flexDirection: "row",
    marginBottom: 6,
    alignItems: "flex-end",
    gap: 8,
  },
  messageRowMine: { justifyContent: "flex-end" },
  messageRowOther: { justifyContent: "flex-start" },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  messageAvatarAvatar: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageAvatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
  bubbleTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: "right",
  },
  bubbleTimeMine: { color: "rgba(255,255,255,0.7)" },
  bubbleTimeOther: { color: COLORS.textSecondary },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  messageInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.5,
  },
});

export default ChatUI;
