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
          navigate("/mypage", { replace: true }); // 성공 시 이동
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
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="mx-auto max-w-6xl px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
          <h3 className="text-xl font-semibold text-gray-800">로그인</h3>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
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
              className={`w-28 h-10 rounded-lg text-white text-sm font-medium transition ${
                loginMutation.isPending
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loginMutation.isPending ? "로그인 중..." : "로그인"}
            </button>
          </form>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
          <h3 className="text-sm font-semibold text-gray-700">이미지 영역</h3>
          <div className="mt-3 rounded-2xl border border-gray-200 h-[360px]" />
        </div>
      </div>
    </div>
  );
};

export default Login;
