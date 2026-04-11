import { Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import prisma from "../config/database";
import { sendSuccess, sendError } from "../utils/response";
import { logger } from "../utils/logger";

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

    const uploadToCloudinary = (): Promise<string> => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "aidiatrack/profiles",
            public_id: `user_${userId}`,
            overwrite: true,
            transformation: [
              {
                width: 200,
                height: 200,
                crop: "fill",
                gravity: "face",
              },
              { quality: "auto", fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error || !result) {
              reject(error ?? new Error("Upload failed"));
            } else {
              resolve(result.secure_url);
            }
          },
        );

        streamifier.createReadStream(req.file!.buffer).pipe(uploadStream);
      });
    };

    const photoUrl = await uploadToCloudinary();

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { photoUrl },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        photoUrl: true,
        language: true,
        doctorId: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
      },
    });

    logger.success("Profile photo uploaded", { userId, photoUrl });
    sendSuccess(res, { user: updated }, 200, "Photo updated successfully");
  } catch (error: unknown) {
    logger.error("uploadProfilePhoto failed", error);
    sendError(res, 500, "Photo upload failed");
  }
};
