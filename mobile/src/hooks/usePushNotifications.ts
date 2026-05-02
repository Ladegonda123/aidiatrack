import { useEffect } from "react";
import { registerForPushNotifications } from "../utils/registerPushToken";

export const usePushNotifications = (enabled: boolean = true): void => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const run = async (): Promise<void> => {
      await registerForPushNotifications();
    };

    run().catch(() => {
      // Silent failure: push registration should never block app usage.
    });
  }, [enabled]);
};
