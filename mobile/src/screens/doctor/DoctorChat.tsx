import React, { useCallback, useLayoutEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
  NavigationProp,
} from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import ChatUI from "../../components/ChatUI";
import { RootStackParamList } from "../../types";
import { markMessagesRead } from "../../api/chatAPI";
import { COLORS } from "../../utils/colors";
import { chatEvents, CHAT_EVENTS } from "../../utils/chatEvents";

type RouteType = RouteProp<RootStackParamList, "DoctorChat">;

const DoctorChat = (): React.JSX.Element => {
  const { t } = useTranslation();
  const { user, refreshChatUnread } = useAuth();
  const route = useRoute<RouteType>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const params = route.params as RootStackParamList["DoctorChat"] | undefined;
  const patientId = params?.patientId;

  useFocusEffect(
    useCallback(() => {
      if (!patientId) return;

      const clearUnread = async (): Promise<void> => {
        try {
          await markMessagesRead(patientId);
          chatEvents.emit(CHAT_EVENTS.MESSAGES_READ, { patientId });
          await refreshChatUnread();
        } catch {
          // Silent fail to avoid blocking chat view.
        }
      };

      clearUnread().catch(() => {
        // Silent fail to avoid blocking chat view.
      });
    }, [patientId]),
  );

  if (!params) {
    return (
      <View style={styles.noPatient}>
        <Text style={styles.noPatientIcon}>💬</Text>
        <Text style={styles.noPatientText}>{t("chat.noMessages")}</Text>
      </View>
    );
  }

  if (!user) {
    return <View style={styles.noPatient} />;
  }

  return (
    <ChatUI
      currentUserId={user.id}
      otherUserId={params.patientId}
      otherUserName={params.patientName}
      otherUserPhotoUrl={params.patientPhotoUrl ?? null}
      onBack={() => navigation.goBack()}
      useBottomSafeArea={true}
    />
  );
};

const styles = StyleSheet.create({
  noPatient: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  noPatientIcon: {
    fontSize: 52,
  },
  noPatientText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});

export default DoctorChat;
