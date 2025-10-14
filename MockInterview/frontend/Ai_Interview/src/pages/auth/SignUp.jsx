// src/pages/auth/SignUp.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../../components/inputs/Input";
import { validateEmail } from "../../utils/helper";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuthStore } from "../../stores/authStore"; // ✅ Zustand 로그인 상태
import { toast } from "react-hot-toast"; // ✅ 토스트 알림 추가

const AUTO_LOGIN_AFTER_SIGNUP = true; // ✅ 자동 로그인 활성화

const SignUp = () => {
  const [signId, setSignId] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const isEmailValid = useMemo(() => validateEmail(email), [email]);
  const isPwLongEnough = useMemo(() => (password?.length || 0) >= 8, [password]);
  const isPwMatch = useMemo(() => password && password2 && password === password2, [password, password2]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!signId.trim()) return setError("아이디를 입력해 주세요");
    if (!username.trim()) return setError("이름을 입력해 주세요");
    if (!isEmailValid) return setError("올바른 이메일 주소를 입력해 주세요");
    if (!isPwLongEnough) return setError("비밀번호는 8자 이상 입력해 주세요");
    if (!isPwMatch) return setError("비밀번호가 일치하지 않습니다");
    setError("");

    const idTrim = signId.trim();
    const pwTrim = password.trim();
    const nameTrim = username.trim();
    const emailTrim = email.trim();

    try {
      setIsSubmitting(true);

      // ✅ 회원가입
      await axiosInstance.post(API_PATHS.AUTH.REGISTER, {
        id: idTrim,
        pw: pwTrim,
        name: nameTrim,
        email: emailTrim,
      });

      if (AUTO_LOGIN_AFTER_SIGNUP) {
        // ✅ 자동 로그인
        const res = await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
          id: idTrim,
          pw: pwTrim,
        });

        const { token, user } = res.data || {};
        if (token) {
          localStorage.setItem("token", token);
          setAuth({ token, user });
        }

        // ✅ 토스트 알림
        toast.success("자동 로그인 되었습니다!", {
          duration: 2500,
          position: "top-center",
          icon: "🎉",
          style: {
            fontSize: "14px",
            borderRadius: "10px",
            background: "#333",
            color: "#fff",
          },
        });

        navigate("/", { replace: true });
      } else {
        toast.success("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.", {
          duration: 2500,
          position: "top-center",
          icon: "✅",
        });
        navigate("/login", { replace: true });
      }
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        (status === 409
          ? "이미 사용 중인 아이디/이메일입니다."
          : "회원가입에 실패했습니다. 다시 시도해 주세요.");
      setError(msg);
      toast.error(msg, {
        duration: 3000,
        position: "top-center",
        style: { fontSize: "13px" },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] py-10">
      <div className="mx-auto max-w-md rounded-2xl bg-white border border-gray-200 shadow-sm p-8">
        <h2 className="text-lg font-semibold">회원가입</h2>

        <form onSubmit={handleSignUp} className="mt-6 space-y-5">
          <Input value={signId} onChange={({ target }) => setSignId(target.value)} label="아이디" placeholder="아이디를 입력하세요" />
          <Input value={username} onChange={({ target }) => setUsername(target.value)} label="이름" placeholder="이름을 입력하세요" />
          <Input value={email} onChange={({ target }) => setEmail(target.value)} label="이메일" placeholder="이메일을 입력하세요" type="email" />
          <Input value={password} onChange={({ target }) => setPassword(target.value)} label="비밀번호" placeholder="비밀번호를 입력하세요" type="password" />
          <Input value={password2} onChange={({ target }) => setPassword2(target.value)} label="비밀번호 확인" placeholder="비밀번호를 다시 입력하세요" type="password" />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full px-5 py-3 rounded-lg text-white transition ${
              isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isSubmitting ? "처리 중..." : "회원가입"}
          </button>

          <p className="text-sm text-gray-700 text-center">
            이미 가입하셨나요?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="font-medium text-blue-600 underline cursor-pointer hover:text-blue-500"
            >
              로그인
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
