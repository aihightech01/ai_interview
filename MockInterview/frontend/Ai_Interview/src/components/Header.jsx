// src/components/Header.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Header = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, isAuth } = useAuth();

  // 액티브 링크 스타일
  const linkCls = (active) =>
    `px-3 py-2 rounded-xl text-sm transition ${
      active ? "bg-gray-900 text-white" : "hover:bg-gray-100 text-gray-700"
    }`;

  return (
    <header className="sticky top-0 z-30 bg-white/70 backdrop-blur border-b border-gray-200">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        {/* 로고: 로그인 시 마이페이지로 이동 */}
        <button
          className="font-semibold tracking-tight text-gray-900 hover:opacity-80 transition cursor-pointer"
          onClick={() => navigate(isAuth ? "/mypage" : "/")}
          aria-label="홈으로 이동"
          title="AI 면접 코치"
        >
          AI 면접 코치
        </button>

        {/* 네비게이션 */}
        {!isAuth ? (
          <nav className="flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              className={linkCls(pathname === "/")}
            >
              Home
            </button>
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
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
