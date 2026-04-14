import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
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
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

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
      socketClient.emit("authenticate", user.id);

      if (user.doctorId) {
        const roomId = getChatRoomId(user.id, user.doctorId);
        socketClient.emit("join_room", {
          roomId,
          patientId: user.id,
          doctorId: user.doctorId,
        });
      }
    });

    socketClient.on("disconnect", () => {
      setIsConnected(false);
    });

    const handleReceiveMessage = (data: {
      message?: string;
      content?: string;
      senderId: number;
      timestamp?: string;
      sentAt?: string;
    }): void => {
      chatEvents.emit(CHAT_EVENTS.NEW_MESSAGE, {
        senderId: data.senderId,
        content: data.message ?? data.content ?? "",
        timestamp: data.timestamp ?? data.sentAt ?? new Date().toISOString(),
      });
    };

    socketClient.on("receive_message", handleReceiveMessage);

    setSocket(socketClient);

    return () => {
      socketClient.off("receive_message", handleReceiveMessage);
      socketClient.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [user]);

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
