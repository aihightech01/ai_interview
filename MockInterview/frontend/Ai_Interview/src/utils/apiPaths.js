/* // utils/apiPaths.js
import axios from "axios";

// .env에 VITE_API_BASE_URL 있으면 쓰고, 없으면 "/api"
export const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").trim();

const axiosInstance = axios.create({
  baseURL: BASE_URL,   // => "/api"
  timeout: 80000,
  headers: { "Content-Type": "application/json" },
});

// 요청 시 토큰 자동 추가
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;

// 엔드포인트 경로 상수
export const API_PATHS = {
  QUESTIONS: "/questions",
  CUSTOM_QUESTIONS: "/custom-questions", // ✅ 복수형으로 통일
  INTERVIEWS: "/interviews",
  AUTH: {
    REGISTER: "/user/register",
    LOGIN: "/user/login",
  },
};
 */

// utils/apiPaths.js

// utils/apiPaths.js

import axios from "axios";

/** 
 * ✅ .env 권장: VITE_API_BASE_URL=http://172.31.57.139:8080/api
 *    (.env가 없다면 아래 기본값 사용)
 */
export const BASE_URL = (import.meta.env?.VITE_API_BASE_URL || "http://172.31.57.139:8080/api").trim();

/** ✅ 공통(JSON)용 axios */
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 80000,
  headers: { "Content-Type": "application/json" },
});
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

/** ✅ 파일 업로드(multipart) 전용 axios */
export const axiosUpload = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
  headers: { "Content-Type": "multipart/form-data" }, // boundary 자동
});
axiosUpload.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default api;

/** ✅ 엔드포인트 경로(※ '/api' 를 포함하지 않음) */
export const API_PATHS = {
  AUTH: {
    LOGIN: "/user/login",
    SIGNUP: "/user/signup",
    ME: "/user/profile",
    REGISTER: "/user/register",
    CHECK_ID: (id) => `/user/check-id?id=${encodeURIComponent(id)}`, // 필요 시
  },

  QUESTIONS: "/questions",                 // GET ?source=COMMON|RESUME|CUSTOM
  CUSTOM_QUESTIONS: "/questions/custom",   // GET/POST/DELETE (커스텀)

  RESUME: {
    UPLOAD: "/resume/upload",              // multipart
    TEXT: "/resume/text",                  // { text }
    FROM_RESUME: "/questions/from-resume", // { resumeId, topK }
  },

  INTERVIEWS: "/interviews",               // POST { questionIds[] } -> session 생성
  INTERVIEW: (sessionId) => `/interviews/${sessionId}`,
  PROGRESS: (sessionId) => `/interviews/${sessionId}/progress`,

  DEVICES_ME: "/users/me/devices",

  MEDIA: {
    TICKET: "/media/upload-ticket",
    CONFIRM: "/media/confirm",
    ITEM: (mediaId) => `/media/${mediaId}`,
  },

  /** 🔴 실제 업로드 엔드포인트 */
  VIDEO: {
    UPLOAD: "/video/upload",               // POST multipart { interviewNo, questionNo, file }
  },

  ANALYSIS: {
    CREATE: "/analysis",                   // { sessionId }
    STATUS: (id) => `/analysis/${id}/status`,
    SUMMARY: (id) => `/analysis/${id}/summary`,
  },
};
