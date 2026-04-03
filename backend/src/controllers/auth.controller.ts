import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/database";
import { signToken } from "../config/jwt";
import { saveDeviceToken } from "../services/notification.service";
import { logger } from "../utils/logger";
import { sendError, sendSuccess } from "../utils/response";
import { stripUndefined } from "../utils/helpers";

interface RegisterBody {
  fullName: string;
  email: string;
  password: string;
  role?: "PATIENT" | "DOCTOR";
  fcmToken?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: Date | string;
}

interface LoginBody {
  email: string;
  password: string;
  fcmToken?: string;
}

interface UpdateProfileBody {
  fullName?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: Date | string;
  fcmToken?: string;
}

const sanitizeUser = (user: {
  passwordHash: string;
  [key: string]: unknown;
}): Record<string, unknown> => {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as RegisterBody;
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      sendError(res, 409, "Email already registered");
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const createdUser = await prisma.user.create({
      data: {
        fullName: body.fullName,
        email: body.email,
        passwordHash,
        role: body.role ?? "PATIENT",
        phone: body.phone,
        gender: body.gender,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      },
    });

    const token = signToken({
      userId: createdUser.id,
      role: createdUser.role === "DOCTOR" ? "DOCTOR" : "PATIENT",
      email: createdUser.email,
    });

    if (typeof body.fcmToken === "string" && body.fcmToken.trim().length > 0) {
      await saveDeviceToken(createdUser.id, body.fcmToken.trim());
    }

    sendSuccess(
      res,
      { user: sanitizeUser(createdUser), token },
      201,
      "Registration successful",
    );
  } catch (error: unknown) {
    logger.error("register failed", error);
    sendError(res, 500, "Failed to register user");
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as LoginBody;
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      sendError(res, 401, "Invalid email or password");
      return;
    }

    const passwordMatches = await bcrypt.compare(
      body.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      sendError(res, 401, "Invalid email or password");
      return;
    }

    const token = signToken({
      userId: user.id,
      role: user.role === "DOCTOR" ? "DOCTOR" : "PATIENT",
      email: user.email,
    });

    if (typeof body.fcmToken === "string" && body.fcmToken.trim().length > 0) {
      await saveDeviceToken(user.id, body.fcmToken.trim());
    }

    sendSuccess(
      res,
      { user: sanitizeUser(user), token },
      200,
      "Login successful",
    );
  } catch (error: unknown) {
    logger.error("login failed", error);
    sendError(res, 500, "Failed to log in");
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!user) {
      sendError(res, 404, "User not found");
      return;
    }

    sendSuccess(
      res,
      { user: sanitizeUser(user) },
      200,
      "Profile fetched successfully",
    );
  } catch (error: unknown) {
    logger.error("getMe failed", error);
    sendError(res, 500, "Failed to fetch profile");
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const currentUserId = req.user!.userId;
    const body = req.body as UpdateProfileBody;
    const updateData = stripUndefined({
      fullName: body.fullName,
      phone: body.phone,
      gender: body.gender,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      fcmToken: body.fcmToken?.trim() || undefined,
    });

    if (Object.keys(updateData).length === 0) {
      sendError(res, 400, "No profile fields provided");
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: currentUserId },
      data: updateData,
    });

    sendSuccess(
      res,
      { user: sanitizeUser(updatedUser) },
      200,
      "Profile updated successfully",
    );
  } catch (error: unknown) {
    logger.error("updateProfile failed", error);
    sendError(res, 500, "Failed to update profile");
  }
};
