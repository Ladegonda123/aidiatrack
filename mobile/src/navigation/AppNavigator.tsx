import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../utils/colors";
import { RootStackParamList } from "../types";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import DoctorChat from "../screens/doctor/DoctorChat";
import PatientDetail from "../screens/doctor/PatientDetail";
import PatientNavigator from "./PatientNavigator";
import DoctorNavigator from "./DoctorNavigator";

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = (): React.JSX.Element => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {!user ? (
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
      ) : user.role === "PATIENT" ? (
        <Stack.Screen
          name="PatientTabs"
          component={PatientNavigator}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="DoctorTabs"
            component={DoctorNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PatientDetail"
            component={PatientDetail}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="DoctorChat"
            component={DoctorChat}
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
