// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "http://172.31.57.139:8080",
        changeOrigin: true,
        // 백엔드가 /api 프리픽스 없이 /interviews/... 로 받는다면 ↓ 주석 해제
        // rewrite: (path) => path.replace(/^\/api/, ""),
      },
      // 영상 실제 경로에 맞춰 키 추가 (예: /interviewVideos)
      "/videos": {
        target: "http://172.31.57.139:8080",
        changeOrigin: true,
      },
      // 만약 실제가 /interviewVideos/... 라면 이렇게:
      // "/interviewVideos": {
      //   target: "http://172.31.57.139:8080",
      //   changeOrigin: true,
      // },
    },
  },
});