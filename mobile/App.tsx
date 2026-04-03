import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { usePushNotifications } from "./src/hooks/usePushNotifications";

const PushNotificationRegistrar = ({
  isLoggedIn,
}: {
  isLoggedIn: boolean;
}): null => {
  usePushNotifications(isLoggedIn);
  return null;
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      const token = await AsyncStorage.getItem("aidiatrack_token");
      setIsLoggedIn(Boolean(token));
    };

    checkAuth().catch(() => {
      setIsLoggedIn(false);
    });
  }, []);

  return (
    <View style={styles.container}>
      <PushNotificationRegistrar isLoggedIn={isLoggedIn} />
      <Text>AIDiaTrack mobile app</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
