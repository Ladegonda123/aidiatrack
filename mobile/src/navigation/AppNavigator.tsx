import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../utils/colors";
import { RootStackParamList } from "../types";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import VerifyOtpScreen from "../screens/auth/VerifyOtpScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";
import DoctorChat from "../screens/doctor/DoctorChat";
import AssignPatientScreen from "../screens/doctor/AssignPatientScreen";
import PatientDetailScreen from "../screens/doctor/PatientDetailScreen";
import EditProfileScreen from "../screens/patient/EditProfileScreen";
import ChangePasswordScreen from "../screens/patient/ChangePasswordScreen";
import ReportsScreen from "../screens/patient/ReportsScreen";
import MedicationScreen from "../screens/patient/MedicationScreen";
import PatientNavigator from "./PatientNavigator";
import DoctorNavigator from "./DoctorNavigator";
import OnboardingScreen from "../screens/auth/OnboardingScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = (): React.JSX.Element => {
  const { user, loading } = useAuth();

  const destination = useMemo(() => {
    if (!user) return "auth";

    // Doctors skip onboarding — go straight to dashboard
    if (user.role === "DOCTOR") return "doctor";

    // Patients who haven't completed onboarding
    if (user.role === "PATIENT" && !user.isOnboardingComplete) {
      return "onboarding";
    }

    return "patient";
  }, [user?.id, user?.role, user?.isOnboardingComplete]);

  if (destination === "onboarding") {
    return <OnboardingScreen />;
  }

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
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="VerifyOtp"
            component={VerifyOtpScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
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
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
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
            name="Reports"
            component={ReportsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Medications"
            component={MedicationScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
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
