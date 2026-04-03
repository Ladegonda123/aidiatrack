import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { ENV } from "./env";
import { AuthUser } from "../types";

const buildSignOptions = (): SignOptions => ({
  expiresIn: ENV.JWT_EXPIRES_IN as SignOptions["expiresIn"],
});

export const signToken = (payload: AuthUser): string => {
  return jwt.sign(payload, ENV.JWT_SECRET, buildSignOptions());
};

const isAuthUser = (payload: string | JwtPayload): payload is AuthUser => {
  if (typeof payload === "string") {
    return false;
  }

  return (
    typeof payload.userId === "number" &&
    (payload.role === "PATIENT" || payload.role === "DOCTOR")
  );
};

export const verifyToken = (token: string): AuthUser => {
  const decoded = jwt.verify(token, ENV.JWT_SECRET);

  if (!isAuthUser(decoded)) {
    throw new Error("Invalid token payload");
  }

  return decoded;
};
