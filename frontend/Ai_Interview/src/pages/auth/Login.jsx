// src/pages/auth/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../../components/inputs/Input";
import { useLogin } from "../../hooks/useAuth";

const Login = () => {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const loginMutation = useLogin();

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginMutation.isPending) return;

    const id = loginId.trim();
    const pw = password.trim();

    if (!id) return setError("아이디를 입력해 주세요");
    if (!pw) return setError("비밀번호를 입력해 주세요");
    setError(null);

    loginMutation.mutate(
      { id, pw },
      {
        onSuccess: () => {
          navigate("/", { replace: true });
        },
        onError: (err) => {
          const msg =
            err?.response?.data?.message ||
            (err?.response?.status === 401
              ? "아이디 또는 비밀번호가 올바르지 않습니다"
              : "로그인 실패, 다시 시도해 주세요.");
          setError(msg);
        },
      }
    );
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundImage:
          "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), radial-gradient(1200px 800px at 70% 30%, rgba(147,197,253,0.15), rgba(191,219,254,0.05) 40%, transparent 70%)",
        backgroundSize: "18px 18px, cover",
        backgroundPosition: "0 0, center",
        backgroundColor: "#f8fbff",
      }}
    >
      <div className="w-full max-w-md">
        {/* ===== 로그인 카드 ===== */}
        <div className="bg-white/95 backdrop-blur-sm border border-sky-100 rounded-2xl shadow-[0_8px_24px_rgba(56,189,248,0.08)] p-8">
          {/* ===== 로고 (카드 내부 상단) ===== */}
          <div className="text-center mb-6">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center justify-center gap-2 text-sky-600 hover:text-sky-700 transition font-semibold text-lg"
            >
              
              AI 면접 코치
            </button>
          </div>

          {/* ===== 타이틀 및 설명 ===== */}
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 size-10 rounded-full bg-gradient-to-br from-sky-300/30 to-blue-400/10 ring-8 ring-sky-300/10" />
            <h1 className="text-xl font-semibold text-slate-800">로그인</h1>
            <p className="mt-1 text-sm text-slate-500">
              계정에 로그인해 서비스를 계속 이용하세요
            </p>
          </div>

          {/* ===== 로그인 폼 ===== */}
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              label="아이디"
              placeholder="사용자 아이디를 입력하세요"
              type="text"
              autoComplete="username"
            />
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              label="비밀번호"
              placeholder="비밀번호를 입력하세요"
              type="password"
              autoComplete="current-password"
            />

            {error && <p className="text-red-500 text-xs -mt-1">{error}</p>}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className={`w-full h-11 rounded-xl text-white text-sm font-medium transition shadow-sm ${
                loginMutation.isPending
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-sky-400 to-blue-500 hover:shadow-md hover:brightness-105"
              }`}
            >
              {loginMutation.isPending ? "로그인 중..." : "로그인"}
            </button>
          </form>

          {/* ===== 회원가입 안내 ===== */}
          <div className="mt-6 flex items-center justify-center gap-2 text-sm">
            <span className="text-slate-500">회원가입 하시겠습니까?</span>
            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-sky-200 text-sky-600 hover:bg-sky-50 transition"
            >
              회원가입
              <svg
                className="size-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* ===== 푸터 ===== */}

      </div>
    </div>
  );
};

export default Login;
