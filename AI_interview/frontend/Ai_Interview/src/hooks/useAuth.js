
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

      queryClient.clear();
    },
  });
};

// 로그아웃: 세션/캐시 정리 후 /login으로 이동
export const useLogout = () => {

  return () => {
    // 1) 앱 상태 비우기

    try { typeof clearInterview === "function" && clearInterview(); } catch { }

    // 2) axios Authorization 헤더 제거 (붙어있다면)
    try { delete api.defaults.headers.common.Authorization; } catch { }

    // 3) 브라우저 저장소 정리 (면접 관련 키)
    try {
      sessionStorage.removeItem("interviewNo");
      sessionStorage.removeItem("interviewTitle");
      sessionStorage.removeItem("interviewType");
      sessionStorage.removeItem("interviewTypeLabel");
      sessionStorage.removeItem("interviewTypeColor");
      sessionStorage.removeItem("selectedQuestions");
      // 정말 싹 지우려면: sessionStorage.clear();
    } catch { }

    // 4) React Query 캐시 제거
    try { queryClient.clear(); } catch { }

    // 5) (선택) persist 스토리지 자체도 비우고 싶다면:
    try { useAuthStore.persist?.clearStorage?.(); } catch { }

    // 6) 전체 리로드로 메모리 초기화
    window.location.replace("/");
  };
};