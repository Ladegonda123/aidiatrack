type LogLevel = "INFO" | "SUCCESS" | "WARN" | "ERROR" | "SOCKET";

const serializeMeta = (meta?: unknown): string => {
  if (meta === undefined) {
    return "";
  }

  if (meta instanceof Error) {
    return `\n${meta.stack ?? meta.message}`;
  }

  if (typeof meta === "string") {
    return `\n${meta}`;
  }

  try {
    return `\n${JSON.stringify(meta)}`;
  } catch (_error) {
    return "\n[Unserializable metadata]";
  }
};

const formatMessage = (
  level: LogLevel,
  message: string,
  meta?: unknown,
): string => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}${serializeMeta(meta)}`;
};

const write = (level: LogLevel, message: string, meta?: unknown): void => {
  const formatted = formatMessage(level, message, meta);

  if (level === "ERROR") {
    console.error(formatted);
    return;
  }

  if (level === "WARN") {
    console.warn(formatted);
    return;
  }

  console.log(formatted);
};

export const logger = {
  info: (message: string, meta?: unknown): void => {
    write("INFO", message, meta);
  },
  success: (message: string, meta?: unknown): void => {
    write("SUCCESS", message, meta);
  },
  warn: (message: string, meta?: unknown): void => {
    write("WARN", message, meta);
  },
  error: (message: string, meta?: unknown): void => {
    write("ERROR", message, meta);
  },
  socket: (message: string, meta?: unknown): void => {
    write("SOCKET", message, meta);
  },
};

export default logger;
