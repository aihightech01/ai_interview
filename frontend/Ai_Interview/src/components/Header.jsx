// src/components/Header.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useLogout } from "../hooks/useAuth";

/**
 * Header 통합 컴포넌트
 *
 * variant:
 * - "default": 로고 + (비로그인: 로그인/회원가입, 로그인: 사용자명/로그아웃)
 * - "mypage": 로고 + [Home, 로그아웃]
 * - "back":   뒤로가기 + centerText(중앙 텍스트)
 *
 * props:
 * - title: 로고 텍스트 (기본 "AI 면접 코치")
 * - centerText: 중앙에 보여줄 간단 텍스트 (세션/비디오/날짜 등)
 * - onBack: back 버튼 동작(기본: nav(-1))
 * - className: 상단 wrapper tailwind 보강
 * - border, blur, sticky: 스타일 토글
 * - rightSlot: 우측 영역을 완전히 커스텀해야 할 때 사용(있으면 우선 적용)
 */
const Header = ({
  variant = "default",
  title = "AI 면접 코치",
  centerText,
  onBack,
  className = "",
  border = true,
  blur = true,
  sticky = true,
  rightSlot,
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const { user, token } = useAuthStore();
  const isAuth = !!token;
  const logout = useLogout();

  const wrapCls = [
    sticky ? "sticky top-0" : "",
    "z-30 bg-white/80",
    blur ? "backdrop-blur" : "",
    border ? "border-b border-gray-200/80" : "",
    "w-full",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const Row = ({ children }) => (
    <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
      {children}
    </div>
  );

  const Logo = (
    <button
      onClick={() => navigate("/")}
      className="group inline-flex items-center gap-2 font-semibold text-gray-900 hover:opacity-80 transition"
      aria-label="홈으로"
      title={title}
    >
      <span>{title}</span>
    </button>
  );

  const linkCls = (active) =>
    `px-3 py-2 rounded-xl text-sm transition ${
      active ? "bg-gray-900 text-white" : "hover:bg-gray-100 text-gray-700"
    }`;

  /** ─────────────────────────────────────────
   *  Variant: default (전역 네비)
   *  ───────────────────────────────────────── */
  if (variant === "default") {
    return (
      <header className={wrapCls}>
        <Row>
          {Logo}
          {rightSlot ? (
            rightSlot
          ) : !isAuth ? (
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
        </Row>
      </header>
    );
  }

  /** ─────────────────────────────────────────
   *  Variant: mypage (Home + 로그아웃)
   *  ───────────────────────────────────────── */
  if (variant === "mypage") {
    return (
      <header className={wrapCls.replace("z-30", "z-20")}>
        <Row>
          {Logo}
          {rightSlot ? (
            rightSlot
          ) : (
            <nav className="flex items-center gap-2">
              <button
                onClick={() => navigate("/")}
                className="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
              >
                Home
              </button>
              <button
                onClick={logout}
                className="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
              >
                로그아웃
              </button>
            </nav>
          )}
        </Row>
      </header>
    );
  }

  /** ─────────────────────────────────────────
   *  Variant: back (뒤로가기 + 중앙 텍스트)
   *  예) 세션 상세/프리뷰 상단 바
   *  ───────────────────────────────────────── */
  if (variant === "back") {
    const goBack = () => (onBack ? onBack() : navigate(-1));
    return (
      <header className={wrapCls.replace("z-30", "z-10")}>
        <Row>
          <button
            onClick={goBack}
            className="px-3 py-1 rounded hover:bg-gray-100"
            aria-label="뒤로가기"
          >
            ← 뒤로
          </button>

          <div className="text-sm text-gray-500 truncate">
            {centerText /* 예: `세션 #12 / 비디오 #3` or `· 2025-11-06` */}
          </div>

          {/* 우측 여백 맞추기 */}
          {rightSlot ? (
            rightSlot
          ) : (
            <span className="w-[60px] md:w-[72px]" aria-hidden />
          )}
        </Row>
      </header>
    );
  }

  // fallback
  return (
    <header className={wrapCls}>
      <Row>{Logo}<div /></Row>
    </header>
  );
};

export default Header;
