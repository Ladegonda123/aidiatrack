import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../utils/colors";
import { DoctorTabParamList } from "../types";
import DoctorDashboard from "../screens/doctor/DoctorDashboard";
import DoctorChatList from "../screens/doctor/DoctorChatList";
import ProfileScreen from "../screens/patient/ProfileScreen";

const Tab = createBottomTabNavigator<DoctorTabParamList>();

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
        component={DoctorChatList}
        options={{ title: t("chat.titleDoctor") }}
      />
      <Tab.Screen
        name="DoctorProfile"
        component={ProfileScreen}
        options={{ title: t("profile.title") }}
      />
    </Tab.Navigator>
  );
};

export default DoctorNavigator;
