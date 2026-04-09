import React, { useLayoutEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import ChatUI from "../../components/ChatUI";
import { useAuth } from "../../hooks/useAuth";
import { COLORS } from "../../utils/colors";

const ChatScreen = (): React.JSX.Element => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  if (!user?.doctorId) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.noDoctorContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t("chat.title")}</Text>
          </View>
          <View style={styles.noDoctor}>
            <Text style={styles.noDoctorIcon}>👨‍⚕️</Text>
            <Text style={styles.noDoctorText}>{t("chat.noDoctor")}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ChatUI
      currentUserId={user.id}
      otherUserId={user.doctorId}
      otherUserName={t("chat.titleDoctor")}
    />
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  noDoctorContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  noDoctor: {
    flex: 1,
    backgroundColor: COLORS.background,
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
});

export default ChatScreen;
