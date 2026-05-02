import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import axiosInstance from "../api/axiosInstance";
import { useAuth } from "./AuthContext";
import { chatEvents, CHAT_EVENTS } from "../utils/chatEvents";

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

const getSocketBaseUrl = (): string => {
  const apiUrl = axiosInstance.defaults.baseURL ?? "http://localhost:5000/api";
  return apiUrl.replace(/\/api\/?$/, "");
};

const getChatRoomId = (userId: number, doctorId: number): string => {
  const lowerId = Math.min(userId, doctorId);
  const higherId = Math.max(userId, doctorId);
  return `chat_${lowerId}_${higherId}`;
};

export const SocketProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element => {
  const { user, refreshUserProfile } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const userIdRef = useRef<number | null>(null);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setSocket((currentSocket) => {
        currentSocket?.disconnect();
        return null;
      });
      setIsConnected(false);
      return;
    }

    const socketClient = io(getSocketBaseUrl(), {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
    });

    socketClient.on("connect", () => {
      setIsConnected(true);
      if (userIdRef.current) {
        socketClient.emit("authenticate", userIdRef.current);
      }

      if (user.doctorId && userIdRef.current) {
        const roomId = getChatRoomId(userIdRef.current, user.doctorId);
        socketClient.emit("join_room", {
          roomId,
          patientId: userIdRef.current,
          doctorId: user.doctorId,
        });
      }
    });

    socketClient.on("disconnect", () => {
      setIsConnected(false);
    });

    // receive_message is used ONLY by ChatUI to display messages.
    // Badge/bell updates come through new_message_notification below
    // so that badge updates work even when the user is not in ChatUI.
    const handleReceiveMessage = (data: {
      message?: string;
      content?: string;
      senderId: number;
      timestamp?: string;
      sentAt?: string;
    }): void => {
      // Intentionally empty at SocketContext level — ChatUI has its own listener.
      // Keeping the binding so the handler is cleanly removed on cleanup.
      void data;
    };

    // new_message_notification is sent DIRECTLY to the receiver's socket by
    // the server (not via room broadcast). This fires for all screens, not
    // just when the user has ChatUI open, solving the doctor badge problem.
    const handleNewMessageNotification = (data: {
      senderId: number;
      content: string;
      timestamp: string;
    }): void => {
      chatEvents.emit(CHAT_EVENTS.NEW_MESSAGE, {
        senderId: data.senderId,
        content: data.content ?? "",
        timestamp: data.timestamp ?? new Date().toISOString(),
      });
    };

    socketClient.on("receive_message", handleReceiveMessage);
    socketClient.on("new_message_notification", handleNewMessageNotification);

    const handleDoctorAssigned = (): void => {
      refreshUserProfile().catch(() => {
        // silent fail
      });
    };

    socketClient.on("doctor_assigned", handleDoctorAssigned);

    setSocket(socketClient);

    return () => {
      socketClient.off("receive_message", handleReceiveMessage);
      socketClient.off(
        "new_message_notification",
        handleNewMessageNotification,
      );
      socketClient.off("doctor_assigned", handleDoctorAssigned);
      socketClient.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [refreshUserProfile, user]);

  useEffect(() => {
    if (socket && userIdRef.current && socket.connected) {
      socket.emit("authenticate", userIdRef.current);
      console.log("[Socket] Re-authenticated as user:", userIdRef.current);
    }
  }, [socket, user?.id]);

  const value = useMemo<SocketContextValue>(
    () => ({ socket, isConnected }),
    [isConnected, socket],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextValue => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};
