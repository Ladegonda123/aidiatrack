import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { verifyToken } from "../config/jwt";
import { AuthUser } from "../types";
import { sendError } from "../utils/response";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
      sendError(res, 401, "Authentication required");
      return;
    }

    const token = authorizationHeader.slice(7).trim();

    if (!token) {
      sendError(res, 401, "Authentication required");
      return;
    }

    const user = verifyToken(token) as AuthUser;
    req.user = user;
    next();
  } catch (error: unknown) {
    if (
      error instanceof jwt.TokenExpiredError ||
      (error instanceof Error && error.name === "TokenExpiredError")
    ) {
      sendError(res, 401, "Token has expired — please log in again");
      return;
    }

    sendError(res, 401, "Invalid or expired token");
  }
};
