import { Request, Response } from "express";
import { Readable } from "stream";
import cloudinary from "../config/cloudinary";
import prisma from "../config/database";
import { sendSuccess, sendError } from "../utils/response";
import { logger } from "../utils/logger";

const uploadBufferToCloudinary = async (
  buffer: Buffer,
  userId: number,
): Promise<{ secure_url: string }> => {
  return await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "aidiatrack/profiles",
        public_id: `user_${userId}`,
        overwrite: true,
        transformation: [
          { width: 200, height: 200, crop: "fill", gravity: "face" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }

        resolve({ secure_url: result.secure_url });
      },
    );

    Readable.from(buffer).pipe(uploadStream);
  });
};

export const uploadProfilePhoto = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    if (!req.file) {
      sendError(res, 400, "No file provided");
      return;
    }

    const uploaded = await uploadBufferToCloudinary(req.file.buffer, userId);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { photoUrl: uploaded.secure_url },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        photoUrl: true,
        language: true,
        fcmToken: true,
        doctorId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    sendSuccess(res, { user: updatedUser }, 200, "Photo updated");
  } catch (error: unknown) {
    logger.error("uploadProfilePhoto failed", error);
    sendError(res, 500, "Photo upload failed");
  }
};
