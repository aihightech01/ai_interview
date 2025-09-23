// utils/axiosInstance.js
import axios from "axios";
import { BASE_URL } from "./apiPaths";

// JSON을 보낼 때만 Content-Type을 지정하고,
// FormData(파일 업로드)일 때는 절대 지정하지 않는다.
const axiosInstance = axios.create({
  baseURL: BASE_URL,          // 예: "/api" 또는 "http://localhost:8080"
  timeout: 80000,
  // ⚠️ 전역 Content-Type 강제 금지! (FormData boundary 깨짐)
  headers: { Accept: "application/json" },
});

// body를 가질 수 있는 메서드 판별
const BODY_METHODS = new Set(["post", "put", "patch", "delete"]);

// 요청 인터셉터
axiosInstance.interceptors.request.use((config) => {
  // 토큰: accessToken 또는 token 중 존재하는 값 사용
  const token =
    localStorage.getItem("accessToken") || localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  // method 정규화
  const method = (config.method || "get").toLowerCase();

  // 데이터 유형에 따라 Content-Type 조건부 설정
  const isFormData = typeof FormData !== "undefined" && config.data instanceof FormData;

  // FormData면 Content-Type 제거(브라우저가 multipart/form-data; boundary=... 자동 설정)
  if (isFormData) {
    if (config.headers && "Content-Type" in config.headers) {
      delete config.headers["Content-Type"];
    }
    if (config.headers && "content-type" in config.headers) {
      delete config.headers["content-type"];
    }
  } else if (BODY_METHODS.has(method) && config.data !== undefined) {
    // JSON 바디가 있을 때만 Content-Type 지정 (이미 지정되어 있으면 존중)
    const hasCT =
      (config.headers && config.headers["Content-Type"]) ||
      (config.headers && config.headers["content-type"]);
    if (!hasCT) {
      config.headers = config.headers ?? {};
      config.headers["Content-Type"] = "application/json";
    }
  }

  return config;
});

// 응답 인터셉터
axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error?.config?.url || "";
    const status = error?.response?.status;

    // 네트워크/프록시/CORS로 응답 자체가 안 온 경우
    if (error.request && !error.response) {
      console.error("[Network] 서버 응답 없음(프록시/서버/CORS 확인).");
      return Promise.reject(error);
    }

    // 인증 API는 제외(login/register)
    const isAuthApi = /\/api\/user\/(login|register)$/i.test(url);

    if (status === 401 && !isAuthApi) {
      // 토큰 정리 후 홈으로
      localStorage.removeItem("accessToken");
      localStorage.removeItem("token");
      if (window.location.pathname !== "/") window.location.href = "/";
    } else if (status === 500) {
      console.error("서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
