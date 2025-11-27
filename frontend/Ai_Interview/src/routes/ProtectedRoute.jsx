// src/routes/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../stores/authStore"; // Zustand 사용 시
// 만약 아직 Context를 쓰면: import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  // Zustand 사용 시:
  const isAuth = !!useAuthStore.getState().token;
  // Context 사용 시:
  // const { isAuth } = useAuth();
  return isAuth ? <Outlet /> : <Navigate to="/login" replace />;
}
