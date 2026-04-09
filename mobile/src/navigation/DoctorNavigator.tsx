import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { COLORS } from "../utils/colors";
import { DoctorTabParamList } from "../types";
import DoctorDashboard from "../screens/doctor/DoctorDashboard";
import DoctorChat from "../screens/doctor/DoctorChat";

const Tab = createBottomTabNavigator<DoctorTabParamList>();

const DoctorProfileScreen = (): React.JSX.Element => {
  const { t } = useTranslation();
  const { user, updateLanguage, logout } = useAuth();

  return (
    <View style={styles.profileContainer}>
      <Text style={styles.profileTitle}>{t("profile.title")}</Text>
      <Text style={styles.profileSubtitle}>{user?.fullName ?? ""}</Text>

      <View style={styles.row}>
        <TouchableOpacity
          style={styles.action}
          onPress={() => updateLanguage("en")}
        >
          <Text style={styles.actionText}>{t("profile.languageEn")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.action}
          onPress={() => updateLanguage("rw")}
        >
          <Text style={styles.actionText}>{t("profile.languageRw")}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>{t("profile.logout")}</Text>
      </TouchableOpacity>
    </View>
  );
};

const DoctorNavigator = (): React.JSX.Element => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarIcon: ({ color, size }) => {
          const iconName: keyof typeof Ionicons.glyphMap =
            route.name === "DoctorDashboard"
              ? "people-outline"
              : route.name === "DoctorChatList"
                ? "chatbubbles-outline"
                : "person-outline";

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="DoctorDashboard"
        component={DoctorDashboard}
        options={{ title: t("doctor.dashboard.title") }}
      />
      <Tab.Screen
        name="DoctorChatList"
        component={DoctorChat}
        options={{ title: t("chat.titleDoctor") }}
      />
      <Tab.Screen
        name="DoctorProfile"
        component={DoctorProfileScreen}
        options={{ title: t("profile.title") }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  profileContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  profileTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  profileSubtitle: {
    marginTop: 6,
    marginBottom: 12,
    color: COLORS.textSecondary,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  action: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionText: {
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  logout: {
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  logoutText: {
    color: COLORS.card,
    fontWeight: "700",
  },
});

export default DoctorNavigator;
