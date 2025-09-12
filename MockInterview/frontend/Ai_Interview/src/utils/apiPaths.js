// .env에서 관리 권장: VITE_API_BASE_URL 등
//export const BASE_URL = "http://172.31.57.139:8080"; // ← 실제 포트와 동일하게
export const BASE_URL = '/api'; 
import axios from "axios";


const axiosInstance = axios.create({
  baseURL: "/api",   // ✅ 모킹하려면 원격주소 말고 상대경로
  timeout: 80000,
  headers: { "Content-Type": "application/json" },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default axiosInstance;



export const API_PATHS = {
  AUTH: {
    REGISTER: '/user/register',
    LOGIN: '/user/login',
    QUESTIONS: '/questions',
  },
};