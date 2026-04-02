import { Request, Response, NextFunction } from "express";
import xss from "xss";

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === "string") {
      sanitized[key] = xss(value.trim());
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string" ? xss(item.trim()) : item,
      );
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export const sanitizeInput = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  next();
};
