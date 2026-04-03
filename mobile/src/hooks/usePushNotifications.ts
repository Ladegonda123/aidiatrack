import { useEffect } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
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

export const usePushNotifications = (enabled: boolean = true): void => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const run = async (): Promise<void> => {
      await createNotificationChannels();
      await registerForPushNotifications();
    };

    run().catch(() => {
      // Silent failure: push registration should never block app usage.
    });
  }, [enabled]);
};

const createNotificationChannels = async (): Promise<void> => {
  await Notifications.setNotificationChannelAsync("medication_reminders", {
    name: "Medication Reminders",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  await Notifications.setNotificationChannelAsync("bg_alerts", {
    name: "Blood Glucose Alerts",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 500, 250, 500],
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  await Notifications.setNotificationChannelAsync("general", {
    name: "General Notifications",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
  });
};

const registerForPushNotifications = async (): Promise<void> => {
  if (!Device.isDevice) {
    return;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  const { status } =
    existing === "granted"
      ? { status: existing }
      : await Notifications.requestPermissionsAsync();

  if (status !== "granted") {
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await updateFcmToken(token);
};
