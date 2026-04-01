import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || "5000"),
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || "http://localhost:8000",
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

console.log(`[ENV] Loaded — port=${ENV.PORT}, env=${ENV.NODE_ENV}`);
