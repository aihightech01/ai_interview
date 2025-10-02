// utils/axiosInstance.js
import axios from "axios";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 80000,
  headers: { Accept: "application/json" }, // 전역 Content-Type 고정 금지
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // FormData면 Content-Type 제거 → 브라우저가 multipart 자동 설정
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  } else {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.request && !error.response) {
      console.error("[Network] 서버 응답 없음(프록시/서버/CORS 확인).");
      return Promise.reject(error);
    }
    const status = error?.response?.status;
    const path = error?.config?.url || "";

    const isAuthApi = /^\/?user\/(login|register)$/i.test(path.replace(/^\/api\/?/, ""));
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
