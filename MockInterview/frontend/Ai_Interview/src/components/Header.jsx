// src/components/Header.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";      // ✅ Zustand 스토어
import { useLogout } from "../hooks/useAuth"; // ✅ React Query 훅(로그아웃용)

const Header = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const { user, token } = useAuthStore(); // ✅ Zustand에서 인증 정보 읽기
  const isAuth = !!token;
  const logout = useLogout(); // ✅ useLogout 훅 (스토어·캐시·라우팅 정리)

  // 버튼/링크 공통 스타일 함수
  const linkCls = (active) =>
    `px-3 py-2 rounded-xl text-sm transition ${
      active ? "bg-gray-900 text-white" : "hover:bg-gray-100 text-gray-700"
    }`;

  return (
    <header className="sticky top-0 z-30 bg-white/70 backdrop-blur border-b border-gray-200">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        {/* 로고: 로그인 시 마이페이지, 비로그인 시 홈으로 이동 */}
        <button
          className="font-semibold tracking-tight text-gray-900 hover:opacity-80 transition cursor-pointer"
          onClick={() => navigate(isAuth ? "/" : "/")}
          aria-label="홈으로 이동"
          title="AI 면접 코치"
        >
          AI 면접 코치
        </button>

        {/* 네비게이션 */}
        {!isAuth ? (
          <nav className="flex items-center gap-2">
            <button
              onClick={() => navigate("/login")}
              className={linkCls(pathname === "/login")}
            >
              로그인
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="px-4 py-2 rounded-xl text-sm bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              회원가입
            </button>
          </nav>
        ) : (
          <nav className="flex items-center gap-4">
            {/* 로그인 상태: 이름 클릭 시 마이페이지 이동 */}
            <button
              onClick={() => navigate("/mypage")}
              className="text-sm text-gray-700 font-medium hover:text-blue-600 transition"
            >
              {user?.name ?? "사용자"} 님
            </button>
            <button
              onClick={logout}
              className="px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-100"
            >
              로그아웃
            </button>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
