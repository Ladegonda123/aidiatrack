import { Request, Response } from "express";
import prisma from "../config/database";
import { io } from "../server";
import { logger } from "../utils/logger";
import { sendError, sendSuccess } from "../utils/response";
import { getChatRoomId } from "../utils/helpers";
import { AuthUser } from "../types";
import { sendChatNotification } from "../services/notification.service";
import xss from "xss";

interface SendMessageBody {
  receiverId?: number;
  content?: string;
}

const getAuthorizedConversationPeer = async (
  user: AuthUser,
  peerId: number,
): Promise<{ allowed: boolean; reason?: string }> => {
  if (user.role === "PATIENT") {
    const patient = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { doctorId: true, role: true },
    });

    if (!patient || patient.role !== "PATIENT") {
      return { allowed: false, reason: "Patient account not found" };
    }

    if (patient.doctorId !== peerId) {
      return {
        allowed: false,
        reason: "You can only access chat with your assigned doctor",
      };
    }

    return { allowed: true };
  }

  if (user.role === "DOCTOR") {
    const patient = await prisma.user.findUnique({
      where: { id: peerId },
      select: { doctorId: true, role: true },
    });

    if (!patient || patient.role !== "PATIENT") {
      return { allowed: false, reason: "Patient not found" };
    }

    if (patient.doctorId !== user.userId) {
      return {
        allowed: false,
        reason: "You can only access chats for your assigned patients",
      };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: "Invalid user role" };
};

export const getMessages = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user!;
    const doctorId = Number.parseInt(String(req.params.doctorId), 10);

    if (!Number.isFinite(doctorId) || doctorId <= 0) {
      sendError(res, 400, "Invalid doctor ID");
      return;
    }

    const auth = await getAuthorizedConversationPeer(user, doctorId);
    if (!auth.allowed) {
      sendError(res, 403, auth.reason ?? "Access denied");
      return;
    }

    const lastMessagesDesc = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: user.userId, receiverId: doctorId },
          { senderId: doctorId, receiverId: user.userId },
        ],
      },
      orderBy: { sentAt: "desc" },
      take: 50,
    });

    const messages = [...lastMessagesDesc].reverse();

    sendSuccess(res, { messages }, 200, "Messages retrieved successfully");
  } catch (error: unknown) {
    logger.error("getMessages failed", error);
    sendError(res, 500, "Failed to retrieve messages");
  }
};

export const sendMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user!;
    const body = req.body as SendMessageBody;
    const receiverId = Number(body.receiverId);
    const content =
      typeof body.content === "string" ? xss(body.content.trim()) : "";

    if (!Number.isFinite(receiverId) || receiverId <= 0) {
      sendError(res, 400, "Valid receiverId is required");
      return;
    }

    if (content.length === 0) {
      sendError(res, 400, "Message content is required");
      return;
    }

    const auth = await getAuthorizedConversationPeer(user, receiverId);
    if (!auth.allowed) {
      sendError(res, 403, auth.reason ?? "Access denied");
      return;
    }

    const message = await prisma.message.create({
      data: {
        senderId: user.userId,
        receiverId,
        content,
      },
    });

    const roomId = getChatRoomId(user.userId, receiverId);
    io.to(roomId).emit("receive_message", message);

    const socketsInRoom = await io.in(roomId).fetchSockets();
    const receiverOnline = socketsInRoom.some(
      (socket) => socket.data.userId === receiverId,
    );

    if (!receiverOnline) {
      const sender = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { fullName: true },
      });

      if (sender) {
        await sendChatNotification(receiverId, sender.fullName, content);
      }
    }

    sendSuccess(res, { message }, 201, "Message sent successfully");
  } catch (error: unknown) {
    logger.error("sendMessage failed", error);
    sendError(res, 500, "Failed to send message");
  }
};
