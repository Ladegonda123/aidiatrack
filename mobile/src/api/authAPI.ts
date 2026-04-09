import axiosInstance from "./axiosInstance";
import { Language, User, UserRole } from "../types";

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  language?: Language;
  fcmToken?: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

interface ApiResponse<T> {
  data: T;
}

export const login = async (
  email: string,
  password: string,
  fcmToken?: string,
): Promise<AuthResponse> => {
  const response = await axiosInstance.post<ApiResponse<AuthResponse>>(
    "/auth/login",
    {
      email,
      password,
      fcmToken,
    },
  );

  const authData = response.data.data ?? null;
  if (!authData) {
    throw new Error("Missing login response data");
  }
  return authData;
};

export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await axiosInstance.post<ApiResponse<AuthResponse>>(
    "/auth/register",
    data,
  );

  const authData = response.data.data ?? null;
  if (!authData) {
    throw new Error("Missing register response data");
  }
  return authData;
};

export const getMe = async (): Promise<User> => {
  const response = await axiosInstance.get<ApiResponse<User>>("/auth/me");
  const user = response.data.data ?? null;
  if (!user) {
    throw new Error("Missing current user response data");
  }
  return user;
};

export const updateProfile = async (
  data: Partial<Omit<User, "id" | "role" | "email">>,
): Promise<User> => {
  const response = await axiosInstance.put<ApiResponse<User>>(
    "/auth/profile",
    data,
  );
  return response.data.data;
};

export const updateFcmToken = async (token: string): Promise<void> => {
  await axiosInstance.put<ApiResponse<null>>("/auth/profile", {
    fcmToken: token,
  });
};
