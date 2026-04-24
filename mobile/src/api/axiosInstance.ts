import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import Constants from "expo-constants";
import { getToken } from "../utils/storage";

const API_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  "http://192.168.x.x:5000/api";

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

axiosInstance.interceptors.request.use(
  async (
    config: InternalAxiosRequestConfig,
  ): Promise<InternalAxiosRequestConfig> => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: unknown): Promise<never> => {
    const axiosError = error as {
      response?: { status?: number };
      config?: AxiosRequestConfig;
    };

    if (axiosError.response?.status === 401) {
      const { removeToken, removeUser } = await import("../utils/storage");
      await removeToken();
      await removeUser();
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
