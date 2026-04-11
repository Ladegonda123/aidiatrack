import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || "5000"),
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || "http://localhost:8000",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUD_NAME ?? "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? "",
  EMAIL_USER: process.env.EMAIL_USER ?? "",
  EMAIL_PASS: process.env.EMAIL_PASS ?? "",
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ?? "",
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ?? "",
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ?? "",
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || "").split(","),
  IS_DEV: process.env.NODE_ENV === "development",
};

// Crash the server immediately if these are missing
const REQUIRED_VARS = ["DATABASE_URL", "JWT_SECRET"];
REQUIRED_VARS.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`[FATAL] Missing required environment variable: ${key}`);
  }
});

const CLOUDINARY_VARS = [
  "CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];
const missingCloudinary = CLOUDINARY_VARS.filter((key) => !process.env[key]);
if (missingCloudinary.length > 0) {
  console.warn(
    `[ENV] Cloudinary not configured — photo upload disabled. Missing: ${missingCloudinary.join(", ")}`,
  );
}

if (ENV.NODE_ENV === "production") {
  [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_PRIVATE_KEY",
    "FIREBASE_CLIENT_EMAIL",
  ].forEach((key) => {
    if (!process.env[key]) {
      throw new Error(`[FATAL] Missing ${key}`);
    }
  });
}

console.log(`[ENV] Loaded — port=${ENV.PORT}, env=${ENV.NODE_ENV}`);
