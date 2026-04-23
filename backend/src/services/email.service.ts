import nodemailer from "nodemailer";
import { ENV } from "../config/env";
import { logger } from "../utils/logger";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: ENV.EMAIL_USER,
    pass: ENV.EMAIL_PASS,
  },
});

export const sendOtpEmail = async (
  to: string,
  otp: string,
  language: string,
): Promise<void> => {
  const subject =
    language === "rw"
      ? "AIDiaTrack — Kode yo gusubiramo ijambo ry'ibanga"
      : "AIDiaTrack — Password Reset Code";

  const html =
    language === "rw"
      ? `
        <h2>Kode yo Gusubiramo Ijambo ry'Ibanga</h2>
        <p>Kode yawe ni:</p>
        <h1 style="color:#2E86C1;letter-spacing:8px">${otp}</h1>
        <p>Iyi kode izakora mu minota 10 gusa.</p>
        <p>Niba utasabye gusubiramo ijambo ry'ibanga, reba ubutumwa bwawe.</p>
      `
      : `
        <h2>Password Reset Code</h2>
        <p>Your reset code is:</p>
        <h1 style="color:#2E86C1;letter-spacing:8px">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not request a password reset, ignore this email.</p>
      `;

  try {
    await transporter.sendMail({ from: ENV.EMAIL_USER, to, subject, html });
    logger.info("OTP email sent", { to });
  } catch (error: unknown) {
    logger.error("Failed to send OTP email", { to, error });
    throw error;
  }
};
