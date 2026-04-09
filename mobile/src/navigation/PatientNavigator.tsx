import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../utils/colors";
import { PatientTabParamList } from "../types";
import DashboardScreen from "../screens/patient/DashboardScreen";
import LogHealthScreen from "../screens/patient/LogHealthScreen";
import PredictionsScreen from "../screens/patient/PredictionsScreen";
import ChatScreen from "../screens/patient/ChatScreen";
import ProfileScreen from "../screens/patient/ProfileScreen";

const Tab = createBottomTabNavigator<PatientTabParamList>();

const PatientNavigator = (): React.JSX.Element => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarIcon: ({ color, size }) => {
          const iconName: keyof typeof Ionicons.glyphMap =
            route.name === "Dashboard"
              ? "home-outline"
              : route.name === "LogHealth"
                ? "add-circle-outline"
                : route.name === "Predictions"
                  ? "trending-up-outline"
                  : route.name === "Chat"
                    ? "chatbubble-outline"
                    : "person-outline";

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: t("dashboard.lastReading") }}
      />
      <Tab.Screen
        name="LogHealth"
        component={LogHealthScreen}
        options={{ title: t("logHealth.title") }}
      />
      <Tab.Screen
        name="Predictions"
        component={PredictionsScreen}
        options={{ title: t("predictions.title") }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: t("chat.title") }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t("profile.title") }}
      />
    </Tab.Navigator>
  );
};

export default PatientNavigator;
