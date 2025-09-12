import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";   

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // 프론트에서 '/api'로 호출하면 아래 서버로 프록시
      '/api': {
        target: 'http://172.31.57.139:8080', // ← 실제 백엔드 주소/포트
        changeOrigin: true,
      },
    },
  },
})