import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { io, Socket } from "socket.io-client";

type SocketUser = {
  id: number;
  role?: "PATIENT" | "DOCTOR";
};

type SocketContextValue = {
  socket: Socket | null;
  connectSocket: () => Socket;
  joinRoom: (user: SocketUser, peerId: number) => void;
  disconnectSocket: () => void;
};

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

const getChatRoomId = (userIdA: number, userIdB: number): string => {
  const lowerId = Math.min(userIdA, userIdB);
  const higherId = Math.max(userIdA, userIdB);
  return `chat_${lowerId}_${higherId}`;
};

const createSocket = (): Socket => {
  return io("http://localhost:5000", {
    transports: ["websocket"],
    autoConnect: false,
    withCredentials: true,
  });
};

export const SocketProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element => {
  const socketRef = useRef<Socket | null>(null);

  const connectSocket = (): Socket => {
    if (!socketRef.current) {
      socketRef.current = createSocket();
    }

    if (!socketRef.current.connected) {
      socketRef.current.connect();
    }

    return socketRef.current;
  };

  const joinRoom = (user: SocketUser, peerId: number): void => {
    const socket = connectSocket();
    const roomId = getChatRoomId(user.id, peerId);
    socket.emit("join_room", { roomId, patientId: user.id, doctorId: peerId });
    socket.emit("authenticate", user.id);
  };

  const disconnectSocket = (): void => {
    socketRef.current?.disconnect();
  };

  const value = useMemo<SocketContextValue>(
    () => ({
      socket: socketRef.current,
      connectSocket,
      joinRoom,
      disconnectSocket,
    }),
    [],
  );

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

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
