import React, { useLayoutEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  RouteProp,
  useNavigation,
  useRoute,
  NavigationProp,
} from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import ChatUI from "../../components/ChatUI";
import { RootStackParamList } from "../../types";
import { COLORS } from "../../utils/colors";

type RouteType = RouteProp<RootStackParamList, "DoctorChat">;

const DoctorChat = (): React.JSX.Element => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const route = useRoute<RouteType>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const params = route.params as RootStackParamList["DoctorChat"] | undefined;

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
      onBack={() => navigation.goBack()}
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
