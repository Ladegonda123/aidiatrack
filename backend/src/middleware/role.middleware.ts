import { NextFunction, Request, Response } from "express";
import { sendError } from "../utils/response";

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    if (!userRole) {
      sendError(res, 401, "Authentication required");
      return;
    }

    if (!roles.includes(userRole)) {
      sendError(res, 403, "You do not have permission to access this resource");
      return;
    }

    next();
  };
};
