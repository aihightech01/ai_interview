// utils/axiosInstance.ts
import axios from "axios";
import { BASE_URL } from "./apiPaths";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 80000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error?.config?.url || "";
    const status = error?.response?.status;

    if (error.request && !error.response) {
      console.error("[Network] 서버 응답 없음(프록시/서버/CORS 확인).");
      return Promise.reject(error);
    }

    const isAuthApi = /\/api\/user\/(login|register)$/i.test(url);
    if (status === 401 && !isAuthApi) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/") window.location.href = "/";
    } else if (status === 500) {
      console.error("서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
