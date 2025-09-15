// src/components/Header.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Header = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, isAuth, loading } = useAuth(); // ✅ loading 사용

  const linkCls = (active) =>
    `px-3 py-2 rounded-xl text-sm transition ${
      active ? "bg-gray-900 text-white" : "hover:bg-gray-100 text-gray-700"
    }`;

  // ✅ 로딩 중엔 깜빡임 방지: 우측 네비를 잠시 숨김(또는 스켈레톤)
  const RightNav = () => {
    if (loading) {
      return <div className="w-24 h-8 rounded-lg bg-gray-100 animate-pulse" />;
    }

    if (!isAuth) {
      // 미로그인
      return (
        <nav className="flex items-center gap-2">
          <button onClick={() => navigate("/")} className={linkCls(pathname === "/")}>
            Home
          </button>
          <button onClick={() => navigate("/login")} className={linkCls(pathname === "/login")}>
            로그인
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="px-4 py-2 rounded-xl text-sm bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            회원가입
          </button>
        </nav>
      );
    }

    // 로그인 상태
    return (
      <nav className="flex items-center gap-4">
        {/* ✅ 이름이 없을 땐 로그인 버튼 대신 '마이페이지'를 보여줌 */}
        {!user?.name ? (
          <button
            onClick={() => navigate("/mypage")}
            className="px-3 py-2 rounded-xl text-sm bg-gray-900 text-white hover:bg-gray-800 transition"
          >
            마이페이지
          </button>
        ) : (
          <button
            onClick={() => {
              // TODO: 로그아웃 처리 연결
              console.log("logout");
            }}
            className="text-sm text-gray-600 hover:text-red-500 transition"
          >
            로그아웃
          </button>
        )}
      </nav>
    );
  };

  return (
    <header className="sticky top-0 z-30 bg-white/70 backdrop-blur border-b border-gray-200">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* 로고 */}
          <button
            className="font-semibold tracking-tight text-gray-900 hover:opacity-80 transition cursor-pointer"
            onClick={() => navigate(isAuth ? "/mypage" : "/")}
            aria-label="홈으로 이동"
            title="AI 면접 코치"
          >
            AI 면접 코치
          </button>

          {/* 로그인 + 이름 있을 때만 이름 표시 */}
          {isAuth && !!user?.name && (
            <span
              onClick={() => navigate("/mypage")}
              className="text-sm text-gray-700 font-medium cursor-pointer hover:text-blue-600 transition"
            >
              {user.name} 님
            </span>
          )}
        </div>

        <RightNav />
      </div>
    </header>
  );
};

export default Header;
