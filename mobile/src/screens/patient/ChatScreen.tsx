import React, {
  useLayoutEffect,
  useEffect,
  useState,
  useCallback,
} from "react";
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import ChatUI from "../../components/ChatUI";
import { useAuth } from "../../hooks/useAuth";
import { chatEvents, CHAT_EVENTS } from "../../utils/chatEvents";
import { DoctorListItem, listDoctors } from "../../api/doctorAPI";
import { markMessagesRead } from "../../api/chatAPI";
import { COLORS } from "../../utils/colors";

const ChatScreen = (): React.JSX.Element => {
  const { t } = useTranslation();
  const { user, setChatUnreadCount } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [doctor, setDoctor] = useState<DoctorListItem | null>(null);
  const [loadingDoctor, setLoadingDoctor] = useState<boolean>(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    const fetchDoctorName = async (): Promise<void> => {
      if (!user?.doctorId) {
        setLoadingDoctor(false);
        return;
      }

      try {
        const doctors = await listDoctors();
        const matchedDoctor = doctors.find((item) => item.id === user.doctorId);
        setDoctor(matchedDoctor ?? null);
      } catch {
        setDoctor(null);
      } finally {
        setLoadingDoctor(false);
      }
    };

    fetchDoctorName().catch(() => {
      setDoctor(null);
      setLoadingDoctor(false);
    });
  }, [t, user?.doctorId]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.doctorId) return;

      const clearUnread = async (): Promise<void> => {
        try {
          await markMessagesRead(user.doctorId!);
          setChatUnreadCount(0);
          chatEvents.emit(CHAT_EVENTS.MESSAGES_READ, {
            patientId: user.doctorId,
          });
        } catch {
          // Silent fail to avoid blocking chat screen UX.
        }
      };

      clearUnread().catch(() => {
        // Silent fail to avoid blocking chat screen UX.
      });
    }, [user?.doctorId]),
  );

  if (!user?.doctorId) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t("chat.title")}</Text>
          </View>
          <View style={styles.content}>
            <View style={styles.noDoctor}>
              <Text style={styles.noDoctorIcon}>👨‍⚕️</Text>
              <Text style={styles.noDoctorText}>{t("chat.noDoctor")}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (loadingDoctor) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t("chat.title")}</Text>
          </View>
          <View style={styles.content}>
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={styles.loader}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ChatUI
      currentUserId={user.id}
      otherUserId={user.doctorId}
      otherUserName={doctor?.fullName || t("chat.title")}
      otherUserPhotoUrl={doctor?.photoUrl ?? null}
      keyboardOffset={tabBarHeight - insets.bottom}
    />
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
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  noDoctor: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  noDoctorIcon: { fontSize: 56 },
  noDoctorText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  loader: {
    marginTop: 40,
  },
});

export default ChatScreen;
