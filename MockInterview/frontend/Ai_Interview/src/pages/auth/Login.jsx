import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../../components/inputs/Input";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const Login = ({ setCurrentPage }) => {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const idTrim = loginId.trim();
    const pwTrim = password.trim();

    if (!idTrim) return setError("아이디를 입력해 주세요");
    if (!pwTrim) return setError("비밀번호를 입력해 주세요");
    setError(null);
    setSubmitting(true);

    try {
      // 요청 바디: { id, password }
      const res = await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
        id: idTrim,
        pw: pwTrim,
      });
      console.log("req:id=" + idTrim);
      console.log("req:pw=" + pwTrim);
      console.log("response:res.data=" + JSON.stringify(res.data));

      // 응답 예시: { token, user: { id, name, ... } }
      const { user, token } = res.data || {};
      console.log("response:token=" + token);
      console.log("response:user=" + JSON.stringify(user));
      if (token == null || token.trim() === "") {
        setError("로그인에 실패했습니다. 다시 시도해 주세요");
        return;
      } else {
        navigate("/landing");
      }

      localStorage.setItem("token", token);

      if (user) {
        // 필요한 필드만 저장
        login({ id: user.id, name: user.name, loginId: idTrim });
      } else {
        login({ loginId: idTrim });
      }

      navigate("/");
    } catch (err) {
      console.error(err);
      // 서버 표준 메시지 우선 사용
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (err?.response?.status === 401
          ? "아이디 또는 비밀번호가 올바르지 않습니다"
          : null);

      setError(serverMsg || "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="mx-auto max-w-6xl px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 로그인 카드 */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
          <h3 className="text-xl font-semibold text-gray-800">로그인</h3>
          <p className="mt-2 text-sm text-gray-500">계정 정보로 로그인하세요.</p>

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
              placeholder="8글자 이상 입력하세요"
              type="password"
              autoComplete="current-password"
            />

            {error && <p className="text-red-500 text-xs -mt-1">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className={`w-28 h-10 rounded-lg text-white text-sm font-medium transition ${submitting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              {submitting ? "로그인 중..." : "로그인"}
            </button>

            <p className="text-[13px] text-gray-700 mt-2">
              계정이 없으신가요?{" "}
              <button
                type="button"
                className="font-medium text-blue-600 underline cursor-pointer hover:text-blue-400 transition duration-200"
                onClick={() => navigate("/signup")}
              >
                회원가입
              </button>
            </p>
          </form>
        </div>

        {/* 오른쪽 빈 카드(디자인 매칭) */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
          <h3 className="text-sm font-semibold text-gray-700">이미지 영역</h3>
          <div className="mt-3 rounded-2xl border border-gray-200 h-[360px] m-1" />
        </div>
      </div>
    </div>
  );
};

export default Login;
