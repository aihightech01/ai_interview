// src/utils/axiosInstance.js
import axios from "axios";
import { BASE_URL } from "./apiPaths";
import { useAuthStore } from "../stores/authStore"; // Zustand 사용 중이면 유지

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 80000,
  // 기본은 Accept만: Content-Type은 상황별로
  headers: { Accept: "application/json" },
});

axiosInstance.interceptors.request.use((config) => {
  // 1) 토큰: 우선순위 - Zustand -> localStorage (둘 다 지원)
  let token;
  try {
    token = useAuthStore.getState().token;
  } catch {
    // Zustand가 아직 초기화 전/SSR 등 예외 대비
    token = localStorage.getItem("token");
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // 2) FormData면 Content-Type 제거 (브라우저가 boundary 자동 설정)
  const isFormData =
    typeof FormData !== "undefined" && config.data instanceof FormData;

  if (isFormData) {
    delete config.headers["Content-Type"];
    delete config.headers["content-type"];
  } else {
    // JSON 바디일 때만 명시
    const m = (config.method || "").toLowerCase();
    if (["post", "put", "patch"].includes(m)) {
      config.headers["Content-Type"] = "application/json";
    }
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error?.config?.url || "";
    const method = (error?.config?.method || "UNKNOWN").toUpperCase();
    const status = error?.response?.status;
    const data = error?.response?.data;

    // 서버 응답 자체가 없을 때 (네트워크/CORS/프록시)
    if (error.request && !error.response) {
      console.groupCollapsed("%c[Axios] 🚨 서버 응답 없음", "color: orange; font-weight: bold;");
      console.log("요청:", method, url);
      console.log("에러:", error);
      console.groupEnd();
      return Promise.reject(error);
    }

    // 인증 API는 401 예외 (정상 실패 흐름)
    const isAuthApi = /\/api\/user\/(login|register)$/i.test(url);

    if (status === 401 && !isAuthApi) {
      // 1) 스토어/로컬스토리지 모두 정리
      try { useAuthStore.getState().clearAuth(); } catch {}
      localStorage.removeItem("token");

      // 2) 라우팅 정책 선택: /login 또는 /
      const to = "/login"; // 필요시 "/"로 바꿔도 됨
      if (window.location.pathname !== to) window.location.replace(to);
    }

    if (status >= 500) {
      console.groupCollapsed(`%c[Axios] 💥 서버 오류 ${status}`, "color: red; font-weight: bold;");
      console.log("요청:", method, url);
      console.log("응답 data:", data);
      console.log("원본 error:", error);
      console.groupEnd();
      console.error("서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
