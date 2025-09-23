// utils/apiPaths.js
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
    PROFILE: "/user/profile",
  },

    USER: {
    // 세션의 질문/클립 목록
    PROFILE_LIST: (sessionId) => `/user/profile/${sessionId}`,
    // 특정 비디오(문항) 상세
    PROFILE_DETAIL: (sessionId, videoNo) => `/user/profile/${sessionId}/${videoNo}`,
  },

  VIDEOS: {
    STREAM: (videoNo) => `/videos/stream/${videoNo}`, // ✅ 상대 경로만
  },

};
