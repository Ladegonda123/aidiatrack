import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { ENV } from "./config/env";
import "./config/cloudinary";
import { globalRateLimit } from "./middleware/rateLimit.middleware";
import { sanitizeInput } from "./middleware/sanitize.middleware";
import { errorMiddleware } from "./middleware/error.middleware";

// Routes
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import healthRoutes from "./routes/health.routes";
import predictionRoutes from "./routes/prediction.routes";
import doctorRoutes from "./routes/doctor.routes";
import medicationRoutes from "./routes/medication.routes";
import notificationRoutes from "./routes/notification.routes";
import chatRoutes from "./routes/chat.routes";
import foodRoutes from "./routes/food.routes";
import dietRoutes from "./routes/diet.routes";
import uploadRoutes from "./routes/upload.routes";

export const createApp = (): Express => {
  const app = express();
  const corsOptions = {
    origin: (origin: string | undefined, callback: Function) => {
      // In production allow all origins (mobile app has no fixed origin)
      if (process.env.NODE_ENV === "production") {
        callback(null, true);
      } else {
        const allowed = (process.env.ALLOWED_ORIGINS ?? "")
          .split(",")
          .map((s) => s.trim());
        if (!origin || allowed.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      }
    },
    credentials: true,
  };

  // Middleware
  app.use(globalRateLimit);
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(morgan(ENV.IS_DEV ? "dev" : "combined"));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(sanitizeInput);

  app.get("/ping", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      environment: ENV.NODE_ENV,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    });
  });

  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/health-records", healthRoutes);
  app.use("/api/predictions", predictionRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/doctor", doctorRoutes);
  app.use("/api/medications", medicationRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/foods", foodRoutes);
  app.use("/api/diet", dietRoutes);
  app.use("/api/upload", uploadRoutes);

  // 404 handler
  app.use((_req: Request, res: Response, _next: NextFunction) => {
    res.status(404).json({ success: false, message: "Route not found" });
  });

  // Error handler (must be last)
  app.use(errorMiddleware);

  return app;
};

const app = createApp();
export default app;
