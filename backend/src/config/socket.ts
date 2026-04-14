import { Server, Socket } from "socket.io";
import prisma from "./database";
import { logger } from "../utils/logger";
import { getChatRoomId } from "../utils/helpers";
import { createNotification } from "../controllers/notification.controller";
import { sendPushNotification } from "../services/notification.service";

interface JoinRoomPayload {
  patientId?: number;
  doctorId?: number;
  roomId?: string;
}

interface SendMessagePayload {
  senderId?: number;
  receiverId?: number;
  content?: string;
  roomId?: string;
}

interface RoomPair {
  patientId: number;
  doctorId: number;
}

const onlineUsers = new Map<number, string>();
const lastSeenMap = new Map<number, string>();

export const isUserOnline = (userId: number): boolean => {
  return onlineUsers.has(userId);
};

export const getLastSeen = (userId: number): string | null => {
  return lastSeenMap.get(userId) ?? null;
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

const assertAllowedConversation = async (
  senderId: number,
  receiverId: number,
): Promise<boolean> => {
  const users = await prisma.user.findMany({
    where: { id: { in: [senderId, receiverId] } },
    select: { id: true, role: true, doctorId: true },
  });

  if (users.length !== 2) {
    return false;
  }

  const sender = users.find((user) => user.id === senderId);
  const receiver = users.find((user) => user.id === receiverId);

  if (!sender || !receiver) {
    return false;
  }

  if (sender.role === "PATIENT" && receiver.role === "DOCTOR") {
    return sender.doctorId === receiver.id;
  }

  if (sender.role === "DOCTOR" && receiver.role === "PATIENT") {
    return receiver.doctorId === sender.id;
  }

  return false;
};

export const setupSocket = (io: Server): void => {
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
        if (
          !isPositiveInt(payload.senderId) ||
          typeof payload.content !== "string"
        ) {
          socket.emit("socket_error", {
            message: "Invalid sender or message payload",
          });
          return;
        }

        const content = payload.content.trim();
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

        if (!isPositiveInt(payload.receiverId)) {
          logger.error("[Socket] Missing receiverId", {
            senderId: payload.senderId,
            roomId: payload.roomId,
          });
          return;
        }

        const senderId = payload.senderId;
        const receiverId = payload.receiverId;

        const canSendPromise = assertAllowedConversation(senderId, receiverId);

        canSendPromise
          .then((canSend) => {
            if (!canSend) {
              logger.warn("[Socket] Unauthorized conversation", {
                senderId,
                receiverId,
              });
              return null;
            }

            return prisma.message
              .create({
                data: {
                  senderId,
                  receiverId,
                  content,
                },
                include: {
                  sender: {
                    select: {
                      fullName: true,
                      language: true,
                      fcmToken: true,
                    },
                  },
                  receiver: {
                    select: {
                      fullName: true,
                      language: true,
                      fcmToken: true,
                      id: true,
                    },
                  },
                },
              })
              .then(async (saved) => {
                logger.socket("[Socket] message saved to DB:", saved.id);

                try {
                  const senderName = saved.sender.fullName;
                  const receiverLang = saved.receiver.language ?? "rw";
                  const preview =
                    content.length > 60
                      ? `${content.substring(0, 60)}...`
                      : content;

                  await createNotification({
                    userId: receiverId,
                    type: "chat",
                    title:
                      receiverLang === "rw"
                        ? `Ubutumwa buva kwa ${senderName}`
                        : `Message from ${senderName}`,
                    body: preview,
                    data: {
                      senderId: senderId.toString(),
                      senderName,
                    },
                  });

                  const receiverOnline = onlineUsers.has(receiverId);
                  if (!receiverOnline && saved.receiver.fcmToken) {
                    await sendPushNotification({
                      userId: receiverId,
                      title:
                        receiverLang === "rw"
                          ? `Ubutumwa buva kwa ${senderName}`
                          : `Message from ${senderName}`,
                      body: preview,
                      channelId: "general",
                      data: {
                        type: "chat_message",
                        senderName,
                      },
                    });
                  }
                } catch (notifError: unknown) {
                  logger.error("[Socket] notification failed", notifError);
                }
              });
          })
          .catch((dbError: unknown) => {
            logger.error("[Socket] DB save failed", dbError);
          });
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
