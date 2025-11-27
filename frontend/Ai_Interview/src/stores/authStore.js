// src/stores/authStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      get isAuth() {
        return !!get().token;
      },
      setAuth: ({ token, user = null }) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    {
      name: "auth-store-v1",
      // 보안상 token만 저장 (user는 필요 시 API로 재조회)
      partialize: (state) => ({ token: state.token }),
    }
  )
);
