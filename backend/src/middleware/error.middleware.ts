import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import logger from "../utils/logger";

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error("Unhandled error reached global handler", {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        res.status(409).json({
          success: false,
          message: "A record with this value already exists",
          data: null,
        });
        return;

      case "P2025":
        res.status(404).json({
          success: false,
          message: "Record not found",
          data: null,
        });
        return;

      case "P2003":
        res.status(400).json({
          success: false,
          message: "Related record does not exist",
          data: null,
        });
        return;

      default:
        res.status(400).json({
          success: false,
          message: "Database operation failed",
          data: null,
        });
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      message: "Invalid data provided",
      data: null,
    });
    return;
  }

  if (err.name === "JsonWebTokenError") {
    res.status(401).json({
      success: false,
      message: "Invalid token",
      data: null,
    });
    return;
  }

  if (err.name === "TokenExpiredError") {
    res.status(401).json({
      success: false,
      message: "Token has expired — please log in again",
      data: null,
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: "An unexpected error occurred. Please try again.",
    data: null,
  });
};
