import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { updateFcmToken } from "../api/authAPI";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const configureAndroidChannels = async (): Promise<void> => {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#2E86C1",
  });

  await Notifications.setNotificationChannelAsync("medication_reminders", {
    name: "Medication Reminders",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    sound: "default",
  });

  await Notifications.setNotificationChannelAsync("bg_alerts", {
    name: "Blood Glucose Alerts",
    importance: Notifications.AndroidImportance.HIGH,
  });

  await Notifications.setNotificationChannelAsync("general", {
    name: "General Notifications",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
  });
};

export const registerForPushNotifications = async (): Promise<
  string | null
> => {
  try {
    if (!Device.isDevice) {
      return null;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    await configureAndroidChannels();

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

    const token = tokenData.data;
    await updateFcmToken(token);
    return token;
  } catch {
    return null;
  }
};
