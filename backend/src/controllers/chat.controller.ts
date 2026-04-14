import { Request, Response } from "express";
import prisma from "../config/database";
import { io } from "../server";
import { logger } from "../utils/logger";
import { sendError, sendSuccess } from "../utils/response";
import { getChatRoomId } from "../utils/helpers";
import { AuthUser } from "../types";
import { sendChatNotification } from "../services/notification.service";
import { createNotification } from "./notification.controller";
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

    // Real-time delivery is handled by the socket send_message handler.
    // Do NOT emit receive_message here — that would duplicate the message
    // on any client that is in the room (the socket already delivered it).

    const roomId = getChatRoomId(user.userId, receiverId);
    const socketsInRoom = await io.in(roomId).fetchSockets();
    const receiverOnline = socketsInRoom.some(
      (s) => s.data.userId === receiverId,
    );

    const sender = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { fullName: true },
    });

    if (sender) {
      if (!receiverOnline) {
        // Offline receiver: send push notification (which also creates the DB record)
        await sendChatNotification(receiverId, user.userId, sender.fullName, content);
      } else {
        // Online receiver: no push needed, but always write a DB notification
        // so the bell badge persists across navigation and app restarts.
        const receiver = await prisma.user.findUnique({
          where: { id: receiverId },
          select: { language: true },
        });
        const lang = receiver?.language ?? "rw";
        const preview =
          content.length > 80 ? `${content.substring(0, 80)}...` : content;
        await createNotification({
          userId: receiverId,
          type: "chat",
          title:
            lang === "rw"
              ? `Ubutumwa buva kwa ${sender.fullName}`
              : `Message from ${sender.fullName}`,
          body: preview,
          data: {
            senderName: sender.fullName,
            senderId: user.userId.toString(),
          },
        });
      }
    }

    sendSuccess(res, { message }, 201, "Message sent successfully");
  } catch (error: unknown) {
    logger.error("sendMessage failed", error);
    sendError(res, 500, "Failed to send message");
  }
};

export const getUserPresence = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = Number.parseInt(String(req.params.userId), 10);

    if (!Number.isFinite(id) || id <= 0) {
      sendError(res, 400, "Invalid user ID");
      return;
    }

    const socketPresence = await import("../config/socket");
    const online = socketPresence.isUserOnline(id);
    const lastSeen = online ? null : socketPresence.getLastSeen(id);

    sendSuccess(
      res,
      { userId: id, online, lastSeen },
      200,
      "Presence retrieved successfully",
    );
  } catch (error: unknown) {
    logger.error("getUserPresence failed", error);
    sendSuccess(
      res,
      { userId: 0, online: false, lastSeen: null },
      200,
      "Presence unavailable",
    );
  }
};

export const markMessagesRead = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const reader = req.user!;
    const otherUserId = Number.parseInt(String(req.params.otherUserId), 10);

    if (!Number.isFinite(otherUserId) || otherUserId <= 0) {
      sendError(res, 400, "Invalid user ID");
      return;
    }

    const auth = await getAuthorizedConversationPeer(reader, otherUserId);
    if (!auth.allowed) {
      sendError(res, 403, auth.reason ?? "Access denied");
      return;
    }

    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: reader.userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    sendSuccess(res, null, 200, "Messages marked as read");
  } catch (error: unknown) {
    logger.error("markMessagesRead failed", error);
    sendError(res, 500, "Failed to mark messages as read");
  }
};

export const getUnreadCount = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const count = await prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });

    sendSuccess(res, { unreadCount: count });
  } catch (error: unknown) {
    logger.error("getUnreadCount failed", error);
    sendSuccess(res, { unreadCount: 0 });
  }
};
