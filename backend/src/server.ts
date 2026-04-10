import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { Server } from "socket.io";
import { ENV } from "./config/env";
import { globalRateLimit } from "./middleware/rateLimit.middleware";
import { sanitizeInput } from "./middleware/sanitize.middleware";
import { verifyDatabaseConnection } from "./config/database";
import { setupSocket } from "./config/socket";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import healthRoutes from "./routes/health.routes";
import predictionRoutes from "./routes/prediction.routes";
import doctorRoutes from "./routes/doctor.routes";
import medicationRoutes from "./routes/medication.routes";
import notificationRoutes from "./routes/notification.routes";
import { errorMiddleware } from "./middleware/error.middleware";
import chatRoutes from "./routes/chat.routes";
import foodRoutes from "./routes/food.routes";
import dietRoutes from "./routes/diet.routes";
import uploadRoutes from "./routes/upload.routes";

const app = express();
const httpServer = http.createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: ENV.ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
});
setupSocket(io);

app.use(globalRateLimit);
app.use(helmet());
app.use(
  cors({
    origin: ENV.ALLOWED_ORIGINS,
    credentials: true,
  }),
);
app.use(morgan(ENV.IS_DEV ? "dev" : "combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    environment: ENV.NODE_ENV,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

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

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorMiddleware);

const startServer = async (): Promise<void> => {
  await verifyDatabaseConnection();

  httpServer.listen(ENV.PORT, () => {
    console.log(`AIDiaTrack API running → http://localhost:${ENV.PORT}`);
    console.log(`Environment  : ${ENV.NODE_ENV}`);
    console.log(`🔌 Socket.IO: enabled`);
    console.log(`Health check: http://localhost:${ENV.PORT}/api/health`);
  });
};

startServer();

export default app;
