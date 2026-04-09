import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../utils/colors";
import { RootStackParamList } from "../types";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import DoctorChat from "../screens/doctor/DoctorChat";
import AssignPatientScreen from "../screens/doctor/AssignPatientScreen";
import PatientDetailScreen from "../screens/doctor/PatientDetailScreen";
import SelectDoctorScreen from "../screens/patient/SelectDoctorScreen";
import PatientNavigator from "./PatientNavigator";
import DoctorNavigator from "./DoctorNavigator";

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = (): React.JSX.Element => {
  const { user, loading } = useAuth();

  const destination = useMemo(() => {
    if (!user) return "auth";
    if (user.role === "DOCTOR") return "doctor";
    return "patient";
  }, [user?.id, user?.role]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {destination === "auth" ? (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : destination === "doctor" ? (
        <>
          <Stack.Screen
            name="DoctorTabs"
            component={DoctorNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PatientDetail"
            component={PatientDetailScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="DoctorChat"
            component={DoctorChat}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AssignPatient"
            component={AssignPatientScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="PatientTabs"
            component={PatientNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SelectDoctor"
            component={SelectDoctorScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});

export default AppNavigator;
