import { Server, Socket } from "socket.io";
import prisma from "./database";
import { logger } from "../utils/logger";
import { getChatRoomId } from "../utils/helpers";

interface JoinRoomPayload {
  patientId?: number;
  doctorId?: number;
  roomId?: string;
}

interface SendMessagePayload {
  senderId?: number;
  receiverId?: number;
  message?: string; // field name used by mobile
  content?: string; // kept for backward compatibility
  roomId?: string;
}

interface RoomPair {
  patientId: number;
  doctorId: number;
}

const onlineUsers = new Map<number, string>();
const lastSeenMap = new Map<number, string>();
let socketServer: Server | null = null;

export const isUserOnline = (userId: number): boolean => {
  return onlineUsers.has(userId);
};

export const getLastSeen = (userId: number): string | null => {
  return lastSeenMap.get(userId) ?? null;
};

export const emitDoctorAssigned = (
  patientId: number,
  payload: { doctorId: number; doctorName: string },
): void => {
  const socketId = onlineUsers.get(patientId);

  if (!socketId || !socketServer) {
    return;
  }

  socketServer.to(socketId).emit("doctor_assigned", payload);
};

const isPositiveInt = (value: unknown): value is number => {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
};

const parseRoomId = (
  roomId: string,
): { firstId: number; secondId: number } | null => {
  const match = /^chat_(\d+)_(\d+)$/.exec(roomId);
  if (!match) {
    return null;
  }

  const firstId = Number.parseInt(match[1], 10);
  const secondId = Number.parseInt(match[2], 10);

  if (!Number.isFinite(firstId) || !Number.isFinite(secondId)) {
    return null;
  }

  return { firstId, secondId };
};

const resolveRoomPair = async (
  payload: JoinRoomPayload,
): Promise<RoomPair | null> => {
  if (isPositiveInt(payload.patientId) && isPositiveInt(payload.doctorId)) {
    return { patientId: payload.patientId, doctorId: payload.doctorId };
  }

  if (typeof payload.roomId !== "string") {
    return null;
  }

  const parsed = parseRoomId(payload.roomId);
  if (!parsed) {
    return null;
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [parsed.firstId, parsed.secondId] } },
    select: { id: true, role: true },
  });

  if (users.length !== 2) {
    return null;
  }

  const patient = users.find((user) => user.role === "PATIENT");
  const doctor = users.find((user) => user.role === "DOCTOR");

  if (!patient || !doctor) {
    return null;
  }

  return { patientId: patient.id, doctorId: doctor.id };
};

const isValidDoctorPatientPair = async (
  patientId: number,
  doctorId: number,
): Promise<boolean> => {
  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { doctorId: true, role: true },
  });

  if (!patient || patient.role !== "PATIENT") {
    return false;
  }

  const doctor = await prisma.user.findUnique({
    where: { id: doctorId },
    select: { role: true },
  });

  if (!doctor || doctor.role !== "DOCTOR") {
    return false;
  }

  return patient.doctorId === doctorId;
};

export const setupSocket = (io: Server): void => {
  socketServer = io;

  io.on("connection", (socket: Socket) => {
    logger.socket("Socket connected", { socketId: socket.id });

    socket.on("authenticate", (userId: number) => {
      socket.data.userId = userId;
      onlineUsers.set(userId, socket.id);
      socket.broadcast.emit("user_online", { userId, online: true });
      logger.socket("User is now online", { userId, socketId: socket.id });
    });

    socket.on("join_room", async (payload: JoinRoomPayload) => {
      try {
        const pair = await resolveRoomPair(payload);
        if (!pair) {
          socket.emit("socket_error", { message: "Invalid room payload" });
          return;
        }

        const allowed = await isValidDoctorPatientPair(
          pair.patientId,
          pair.doctorId,
        );

        if (!allowed) {
          socket.emit("socket_error", { message: "Unauthorized room" });
          return;
        }

        const roomId = getChatRoomId(pair.patientId, pair.doctorId);
        socket.join(roomId);
        logger.socket("Socket joined room", { socketId: socket.id, roomId });
      } catch (error: unknown) {
        logger.error("join_room failed", error);
        socket.emit("socket_error", { message: "Failed to join room" });
      }
    });

    socket.on("send_message", (payload: SendMessagePayload) => {
      try {
        // Accept both 'message' (mobile) and 'content' (legacy) field names
        const rawContent =
          typeof payload.message === "string"
            ? payload.message
            : typeof payload.content === "string"
              ? payload.content
              : null;

        if (!isPositiveInt(payload.senderId) || rawContent === null) {
          socket.emit("socket_error", {
            message: "Invalid sender or message payload",
          });
          return;
        }

        const content = rawContent.trim();
        if (content.length === 0) {
          socket.emit("socket_error", {
            message: "Message content is required",
          });
          return;
        }

        logger.socket("[Socket] send_message received:", {
          roomId: payload.roomId,
          senderId: payload.senderId,
          receiverId: payload.receiverId,
          message: content.substring(0, 30),
        });

        const timestamp = new Date().toISOString();
        const roomId =
          typeof payload.roomId === "string" && payload.roomId.length > 0
            ? payload.roomId
            : isPositiveInt(payload.receiverId)
              ? getChatRoomId(payload.senderId, payload.receiverId)
              : null;

        if (roomId) {
          // STEP 1: Emit to room — real-time delivery for ChatUI on both sides
          io.to(roomId).emit("receive_message", {
            message: content,
            content,
            senderId: payload.senderId,
            receiverId: payload.receiverId,
            timestamp,
            sentAt: timestamp,
          });
          logger.socket("[Socket] emitted to room:", roomId);
        } else {
          logger.warn("[Socket] No roomId available for immediate emit", {
            senderId: payload.senderId,
            receiverId: payload.receiverId,
          });
        }

        // STEP 2: Emit directly to the receiver's individual socket for
        // real-time badge/bell updates — works even when receiver has not
        // joined the room (e.g. doctor is on dashboard, not in ChatUI).
        if (isPositiveInt(payload.receiverId)) {
          const receiverSocketId = onlineUsers.get(payload.receiverId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit("new_message_notification", {
              senderId: payload.senderId,
              content,
              timestamp,
            });
            logger.socket(
              "[Socket] sent new_message_notification to receiver:",
              {
                receiverId: payload.receiverId,
              },
            );
          }
        }

        // STEP 3: DB persistence and push notifications are handled by the
        // HTTP POST /api/chat/send endpoint which the mobile always calls.
        // Keeping DB save out of the socket handler prevents duplicate records.
      } catch (error: unknown) {
        logger.error("[Socket] send_message critical error", error);
      }
    });

    socket.on("disconnect", () => {
      const userId = socket.data.userId as number | undefined;

      if (userId && onlineUsers.get(userId) === socket.id) {
        onlineUsers.delete(userId);
        const lastSeen = new Date().toISOString();
        lastSeenMap.set(userId, lastSeen);

        socket.broadcast.emit("user_offline", { userId, lastSeen });
        logger.socket("User disconnected", { userId, socketId: socket.id });
      }

      logger.socket("Socket disconnected", { socketId: socket.id });
    });
  });
};
