// src/utils/api.js
import axios from "axios";
import { BASE_URL } from "./apiPaths";
import { useAuthStore } from "../stores/authStore";

// ── 옵션: 디버그 on/off, 401 리다이렉트 목적지 ─────────────────────────
let AXIOS_DEBUG = true;                 // 콘솔 로그 켜기/끄기
let AXIOS_REDIRECT_401_TO = "/login";   // 401 → 이동 경로
export const enableAxiosDebug = (on) => { AXIOS_DEBUG = !!on; };
export const setAxios401RedirectTo = (path) => { AXIOS_REDIRECT_401_TO = path || "/login"; };

// ── 인스턴스 기본 설정 ────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,        // '/api' 또는 절대 경로 (env에 따라)
  timeout: 180000,          // 무거운 처리 대비 (필요 시 조절)
  headers: { Accept: "application/json" },
  // withCredentials: true, // 쿠키 세션 인증이면 해제 + 서버 CORS 'Allow-Credentials: true'
});

// ── 유틸: 민감 헤더 마스킹 (로그용) ───────────────────────────────────
const maskHeaders = (headers = {}) => {
  const h = { ...headers };
  if (h.Authorization) h.Authorization = "[REDACTED]";
  if (h.authorization) h.authorization = "[REDACTED]";
  return h;
};

// ── 요청 인터셉터 ────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  // 1) 토큰 (Zustand ▶︎ localStorage fallback)
  let token;
  try {
    token = useAuthStore.getState().token;
  } catch {
    token = localStorage.getItem("token");
  }
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 2) Request-Id (요청 추적)
  config.headers["X-Request-Id"] =
    (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  // 3) Content-Type 처리 (FormData면 삭제해서 boundary 자동 설정)
  const isFormData = typeof FormData !== "undefined" && config.data instanceof FormData;
  if (isFormData) {
    delete config.headers["Content-Type"];
    delete config.headers["content-type"];
  } else {
    const m = (config.method || "").toLowerCase();
    if (["post", "put", "patch"].includes(m) && !config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }
  }

  // 4) 디버그 로그
  if (AXIOS_DEBUG) {
    console.groupCollapsed(
      `%c[REQ] ${config.method?.toUpperCase()} ${config.baseURL || ""}${config.url}`,
      "color:#2563eb;font-weight:bold"
    );
    console.log("headers:", maskHeaders(config.headers));
    if (!isFormData) console.log("data:", config.data);
    if (config.params) console.log("params:", config.params);
    console.groupEnd();
    config.metadata = { start: performance.now?.() || Date.now() };
  }

  return config;
});

// ── 응답 인터셉터 ────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => {
    if (AXIOS_DEBUG) {
      const start = res.config?.metadata?.start;
      const ms = start ? Math.round((performance.now?.() || Date.now()) - start) : null;
      console.groupCollapsed(
        `%c[RES] ${res.status} ${res.config?.url}${ms ? ` (${ms}ms)` : ""}`,
        "color:#16a34a;font-weight:bold"
      );
      console.log("headers:", maskHeaders(res.config?.headers || {}));
      console.log("data:", res.data);
      console.groupEnd();
    }
    return res;
  },
  (error) => {
    const url = error?.config?.url || "";
    const method = (error?.config?.method || "UNKNOWN").toUpperCase();
    const status = error?.response?.status;
    const data = error?.response?.data;

    // 응답 자체가 없음 (네트워크/CORS/프록시)
    if (error.request && !error.response) {
      if (AXIOS_DEBUG) {
        console.groupCollapsed("%c[ERR] 서버 응답 없음", "color:orange;font-weight:bold");
        console.log("요청:", method, url);
        console.log("원본 error:", error);
        console.groupEnd();
      }
      return Promise.reject(error);
    }

    // 인증/회원가입 등 의도적 401은 자동 처리 제외 (네 경로에 맞춤)
    const isAuthApi = /(\/auth|\/user)\/(login|register|signup)$/i.test(url);

    // 401: 토큰 만료 등 → 세션 정리 + 리다이렉트 (무한 루프 방지 포함)
    if (status === 401 && !isAuthApi) {
      try { useAuthStore.getState().clearAuth(); } catch {}
      localStorage.removeItem("token");

      if (AXIOS_DEBUG) {
        console.groupCollapsed("%c[ERR] 401 Unauthorized", "color:#ef4444;font-weight:bold");
        console.log("요청:", method, url);
        console.log("응답 data:", data);
        console.groupEnd();
      }

      const to = AXIOS_REDIRECT_401_TO || "/login";
      if (typeof window !== "undefined" && window.location.pathname !== to) {
        window.location.replace(to);
      }
    }

    if (AXIOS_DEBUG) {
      console.groupCollapsed(
        `%c[ERR] ${status || "NO_STATUS"} ${method} ${url}`,
        "color:#ef4444;font-weight:bold"
      );
      console.log("응답 data:", data || error?.message);
      console.groupEnd();
    }

    return Promise.reject(error);
  }
);

export default api;
