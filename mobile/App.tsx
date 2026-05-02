import "./src/i18n/index";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider } from "./src/context/AuthContext";
import { SocketProvider } from "./src/context/SocketContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { useAuth } from "./src/hooks/useAuth";
import { registerForPushNotifications } from "./src/utils/registerPushToken";

const PushTokenBootstrap = (): null => {
  const { user, loading } = useAuth();
  const hasBootstrappedRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    if (loading || hasBootstrappedRef.current) {
      return;
    }

    hasBootstrappedRef.current = true;

    if (!user) {
      return;
    }

    registerForPushNotifications().catch(() => {
      // silent fail
    });
  }, [loading, user?.id]);

  return null;
};

export default function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <SocketProvider>
        <PushTokenBootstrap />
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </SocketProvider>
    </AuthProvider>
  );
}
