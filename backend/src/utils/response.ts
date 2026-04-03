import { Response } from "express";
import { ApiError, ApiSuccess } from "../types";

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  message: string = "Success",
  meta?: Record<string, unknown>,
): Response<ApiSuccess<T>> => {
  const body: ApiSuccess<T> = {
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  };

  return res.status(statusCode).json(body);
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  details?: unknown,
): Response<ApiError> => {
  const body: ApiError = {
    success: false,
    message,
    ...(details !== undefined ? { details } : {}),
  };

  return res.status(statusCode).json(body);
};
