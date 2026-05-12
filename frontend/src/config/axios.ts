import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { authService } from "../services/authService";

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// ============================================================================
// Base URLs — read from env with fallbacks
// ============================================================================

const NODE_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_NODE_APP;

const FASTAPI_BASE_URL =
  import.meta.env.VITE_AI_URL ||
  import.meta.env.VITE_FASTAPI_URL ||
  import.meta.env.VITE_FAST_API;

// ============================================================================
// Shared token refresh state
// ============================================================================

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: AxiosError) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : token && p.resolve(token)));
  failedQueue = [];
};

const refreshAndRetry = async (
  originalRequest: RetryConfig,
  retryFn: (req: RetryConfig) => Promise<any>
): Promise<any> => {
  // Already retried once — full auth failure
  if (originalRequest._retry) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/";
    return Promise.reject(new Error("Session expired. Please log in again."));
  }

  // Another refresh already in flight — queue this request
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({
        resolve: (token: string) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(retryFn(originalRequest));
        },
        reject,
      });
    });
  }

  originalRequest._retry = true;
  isRefreshing = true;

  try {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) throw new Error("No refresh token");

    const response = await authService.refreshToken(refreshToken);
    const { accessToken, refreshToken: newRefreshToken } = response.data;

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", newRefreshToken);

    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
    processQueue(null, accessToken);

    return retryFn(originalRequest);
  } catch (err) {
    processQueue(err as AxiosError, null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/";
    return Promise.reject(err);
  } finally {
    isRefreshing = false;
  }
};

// ============================================================================
// Node.js backend instance  →  http://localhost:4000/api/*
// ============================================================================

const axiosInstance = axios.create({
  baseURL: `${NODE_BASE_URL}/api`,
  headers: { "Content-Type": "application/json" },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const req = error.config as RetryConfig;
    if (error.response?.status !== 401 || !req) return Promise.reject(error);
    return refreshAndRetry(req, (r) => axiosInstance(r));
  }
);

// ============================================================================
// FastAPI instance  →  http://localhost:8000/api/*
// ============================================================================

export const fastapiInstance = axios.create({
  baseURL: `${FASTAPI_BASE_URL}/api`,
  headers: { "Content-Type": "application/json" },
});

fastapiInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

fastapiInstance.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const req = error.config as RetryConfig;
    if (error.response?.status !== 401 || !req) return Promise.reject(error);
    return refreshAndRetry(req, (r) => fastapiInstance(r));
  }
);

export default axiosInstance;
