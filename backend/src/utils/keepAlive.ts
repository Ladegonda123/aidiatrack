import https from "https";
import { ENV } from "../config/env";

const BACKEND_URL = ENV.KEEP_ALIVE_BACKEND_URL;
const AI_URL = ENV.KEEP_ALIVE_AI_URL;

export const startKeepAlive = (): void => {
  const ping = (url: string): void => {
    https
      .get(url, (res) => {
        console.log(`[KeepAlive] ${url} -> ${res.statusCode}`);
      })
      .on("error", (err) => {
        console.warn(`[KeepAlive] Failed to ping ${url}:`, err.message);
      });
  };

  // Ping every 14 minutes to prevent Render free tier sleep
  setInterval(() => {
    ping(BACKEND_URL);
    ping(AI_URL);
  }, 14 * 60 * 1000);

  console.log("[KeepAlive] Started - pinging every 14 minutes");
};
