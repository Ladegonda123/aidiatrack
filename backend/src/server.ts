import http from 'http';
import { Server } from 'socket.io';
import { ENV } from './config/env';
import { verifyDatabaseConnection } from './config/database';
import { setupSocket } from './config/socket';
import { registerReminderCrons } from './services/reminder.service';
import app from './app';

const httpServer = http.createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: ENV.ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
setupSocket(io);

const startServer = async (): Promise<void> => {
  await verifyDatabaseConnection();
  registerReminderCrons();

  httpServer.listen(ENV.PORT, () => {
    console.log(`AIDiaTrack API running → http://localhost:${ENV.PORT}`);
    console.log(`Environment  : ${ENV.NODE_ENV}`);
    console.log(`🔌 Socket.IO: enabled`);
    console.log(`Health check: http://localhost:${ENV.PORT}/api/health`);
  });
};

// Only start server if this is the main module
if (require.main === module) {
  startServer();
}

export default app;
