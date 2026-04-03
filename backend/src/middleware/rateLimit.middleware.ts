import rateLimit, { Options } from "express-rate-limit";

interface StandardErrorBody {
  success: false;
  message: string;
  data: null;
}

const rateLimitHandler: NonNullable<Options["handler"]> = (
  _req,
  res,
  _next,
  options,
): void => {
  res.status(options.statusCode).json({
    success: false,
    message:
      typeof options.message === "string"
        ? options.message
        : "Too many requests. Please try again later.",
    data: null,
  } satisfies StandardErrorBody);
};

// Auth endpoints: max 10 attempts per 15 minutes per IP
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: rateLimitHandler,
  message: "Too many login attempts. Please wait 15 minutes and try again.",
  standardHeaders: true,
  legacyHeaders: false,
});

// General API: max 100 requests per minute per IP
export const globalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  handler: rateLimitHandler,
  message: "Too many requests. Please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalRateLimit = globalRateLimit;
