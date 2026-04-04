import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { getToken } from "../utils/storage";

const BASE_URL = "http://172.31.213.68:5000/api";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
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
