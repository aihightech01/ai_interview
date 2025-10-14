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
      setAuth: ({ token, user }) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    { name: "auth-store-v1" }
  )
);
