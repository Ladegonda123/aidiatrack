import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/database";
import { signToken } from "../config/jwt";
import { saveDeviceToken } from "../services/notification.service";
import { sendOtpEmail } from "../services/email.service";
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
  language?: string;
}

interface LoginBody {
  email: string;
  password: string;
  fcmToken?: string;
}

interface UpdateProfileBody {
  fullName?: string;
  language?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: Date | string;
  fcmToken?: string;
  reminderEnabled?: boolean;
  reminderTimes?: string[];
}

interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

interface ForgotPasswordBody {
  email: string;
}

interface ResetPasswordBody {
  email: string;
  otp: string;
  newPassword: string;
}

interface StoredOtp {
  otp: string;
  expiresAt: number;
  userId: number;
}

const otpStore = new Map<string, StoredOtp>();

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
        language: body.language ?? "rw",
      },
    });

    const token = signToken({
      userId: createdUser.id,
      role: createdUser.role === "DOCTOR" ? "DOCTOR" : "PATIENT",
      email: createdUser.email,
      language: createdUser.language,
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
      language: user.language,
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
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        language: true,
        photoUrl: true,
        doctorId: true,
        fcmToken: true,
        reminderEnabled: true,
        reminderTimes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      sendError(res, 404, "User not found");
      return;
    }

    sendSuccess(res, { user }, 200, "Profile fetched successfully");
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
    const {
      fullName,
      phone,
      gender,
      dateOfBirth,
      language,
      fcmToken,
      reminderEnabled,
      reminderTimes,
    } = req.body as UpdateProfileBody;

    const updateData = stripUndefined({
      fullName,
      phone: phone || null,
      gender: gender || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      language,
      fcmToken,
      reminderEnabled,
      reminderTimes: Array.isArray(reminderTimes) ? reminderTimes : undefined,
    });

    const updatedUser = await prisma.user.update({
      where: { id: currentUserId },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        language: true,
        photoUrl: true,
        doctorId: true,
        fcmToken: true,
        reminderEnabled: true,
        reminderTimes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    sendSuccess(res, { user: updatedUser }, 200, "Profile updated");
  } catch (error: unknown) {
    logger.error("updateProfile failed", error);
    sendError(res, 500, "Failed to update profile");
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const currentUserId = req.user!.userId;
    const body = req.body as ChangePasswordBody;

    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      sendError(res, 404, "User not found");
      return;
    }

    const currentPasswordMatches = await bcrypt.compare(
      body.currentPassword,
      user.passwordHash,
    );

    if (!currentPasswordMatches) {
      sendError(res, 401, "Current password is incorrect");
      return;
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 12);

    await prisma.user.update({
      where: { id: currentUserId },
      data: { passwordHash },
    });

    sendSuccess(res, null, 200, "Password changed successfully");
  } catch (error: unknown) {
    logger.error("changePassword failed", error);
    sendError(res, 500, "Failed to change password");
  }
};

export const requestPasswordReset = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const body = req.body as ForgotPasswordBody;
    const email = body.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, language: true },
    });

    if (user) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore.set(email, {
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000,
        userId: user.id,
      });

      try {
        await sendOtpEmail(user.email, otp, user.language);
      } catch (error: unknown) {
        logger.error("sendOtpEmail failed", error);
      }
    }

    sendSuccess(res, null, 200, "If this email exists you will receive a code");
  } catch (error: unknown) {
    logger.error("requestPasswordReset failed", error);
    sendError(res, 500, "Failed to request password reset");
  }
};

export const verifyOtpAndReset = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const body = req.body as ResetPasswordBody;
    const email = body.email.trim().toLowerCase();
    const storedOtp = otpStore.get(email);

    if (!storedOtp || storedOtp.expiresAt < Date.now()) {
      otpStore.delete(email);
      sendError(res, 400, "Invalid or expired code");
      return;
    }

    if (storedOtp.otp !== body.otp) {
      sendError(res, 400, "Invalid code");
      return;
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 12);
    await prisma.user.update({
      where: { id: storedOtp.userId },
      data: { passwordHash },
    });

    otpStore.delete(email);

    sendSuccess(res, null, 200, "Password reset successfully");
  } catch (error: unknown) {
    logger.error("verifyOtpAndReset failed", error);
    sendError(res, 500, "Failed to reset password");
  }
};
