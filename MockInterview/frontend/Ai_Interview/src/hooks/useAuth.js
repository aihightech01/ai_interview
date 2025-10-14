// src/features/auth/useAuth.js
import { useMutation } from "@tanstack/react-query";
import api from "../utils/axiosInstance";
import { useAuthStore } from "../stores/authStore";
import { queryClient } from "../utils/queryClient";

// 로그인: { id, pw } → { token, user }
export const useLogin = () => {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: async ({ id, pw }) => {
      const { data } = await api.post("/user/login", { id, pw });
      return data; // { token, user }
    },
    onSuccess: (data, variables) => {
      const { token, user } = data || {};
      if (!token) throw new Error("토큰 없음");
      setAuth({ token, user: user ?? { id: variables.id } });
      // 사용자 전환/초기 로그인 시 캐시 초기화 (가장 안전)
      queryClient.clear();
    },
  });
};

// 로그아웃: 세션/캐시 정리 후 /login으로 이동
export const useLogout = () => {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return () => {
    clearAuth();
    try {
      queryClient.clear();
    } catch {}
    window.location.replace("/login");
  };
};
