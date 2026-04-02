import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { Server } from "socket.io";
import { ENV } from "./config/env";
import { generalRateLimit } from "./middleware/rateLimit.middleware";
import { sanitizeInput } from "./middleware/sanitize.middleware";
import { verifyDatabaseConnection } from "./config/database";
// import { setupSocket } from './config/socket'
// import { errorMiddleware } from './middleware/error.middleware'

// import authRoutes       from './routes/auth.routes'
// import healthRoutes     from './routes/health.routes'
// import adminRoutes from './routes/admin.routes'
// import predictionRoutes from './routes/prediction.routes'
// import chatRoutes       from './routes/chat.routes'
// import doctorRoutes     from './routes/doctor.routes'
// import medicationRoutes from './routes/medication.routes'

const app = express();
const httpServer = http.createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: ENV.ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
});
// setupSocket(io)

app.use(
  cors({
    origin: ENV.ALLOWED_ORIGINS,
    credentials: true,
  }),
);
app.use(helmet());
app.use(morgan(ENV.IS_DEV ? "dev" : "combined"));
app.use(express.json({ limit: "10mb" }));
app.use(sanitizeInput);
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    environment: ENV.NODE_ENV,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

app.use("/api", generalRateLimit);

// app.use('/api/auth',           authRoutes)
// app.use('/api/health-records', healthRoutes)
// app.use('/api/admin', adminRoutes)
// app.use('/api/predictions',    predictionRoutes)
// app.use('/api/chat',           chatRoutes)
// app.use('/api/doctor',         doctorRoutes)
// app.use('/api/medications',    medicationRoutes)

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// app.use(errorMiddleware)

const startServer = async (): Promise<void> => {
  await verifyDatabaseConnection()

  httpServer.listen(ENV.PORT, () => {
    console.log(`AIDiaTrack API running → http://localhost:${ENV.PORT}`)
    console.log(`Environment  : ${ENV.NODE_ENV}`)
    console.log(`Socket.IO   : enabled`)
    console.log(`Health check: http://localhost:${ENV.PORT}/api/health`)
  })
}

startServer()

export default app;
