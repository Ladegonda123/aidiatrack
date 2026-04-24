import { EventEmitter } from "eventemitter3";

// Global event bus for chat events.
export const chatEvents = new EventEmitter();

export const CHAT_EVENTS = {
  NEW_MESSAGE: "new_message",
  MESSAGES_READ: "messages_read",
  CHAT_OPENED: "chat_opened",
  CHAT_CLOSED: "chat_closed",
} as const;

export const DASHBOARD_EVENTS = {
  REFRESH: "dashboard_refresh",
} as const;
