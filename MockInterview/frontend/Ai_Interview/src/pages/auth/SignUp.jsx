// src/pages/auth/SignUp.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../../components/inputs/Input";
import { validateEmail } from "../../utils/helper";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuthStore } from "../../stores/authStore";
import { toast } from "react-hot-toast";

const AUTO_LOGIN_AFTER_SIGNUP = true;

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

      await axiosInstance.post(API_PATHS.AUTH.REGISTER, {
        id: idTrim,
        pw: pwTrim,
        name: nameTrim,
        email: emailTrim,
      });

      if (AUTO_LOGIN_AFTER_SIGNUP) {
        const res = await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
          id: idTrim,
          pw: pwTrim,
        });

        const { token, user } = res.data || {};
        if (token) {
          localStorage.setItem("token", token);
          setAuth({ token, user });
        }

        toast.success("자동 로그인 되었습니다!", {
          duration: 2500,
          position: "top-center",
          icon: "🎉",
          style: { fontSize: "14px", borderRadius: "10px", background: "#333", color: "#fff" },
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
        (status === 409 ? "이미 사용 중인 아이디/이메일입니다." : "회원가입에 실패했습니다. 다시 시도해 주세요.");
      setError(msg);
      toast.error(msg, { duration: 3000, position: "top-center", style: { fontSize: "13px" } });
    } finally {
      setIsSubmitting(false);
    }
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
        <div className="bg-white/95 backdrop-blur-sm border border-sky-100 rounded-2xl shadow-[0_8px_24px_rgba(56,189,248,0.08)] p-8">
          <div className="text-center mb-6">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center justify-center gap-2 text-sky-600 hover:text-sky-700 transition font-semibold text-lg"
            >
              AI 면접 코치
            </button>
          </div>
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 size-10 rounded-full bg-gradient-to-br from-sky-300/30 to-blue-400/10 ring-8 ring-sky-300/10" />
            <h1 className="text-xl font-semibold text-slate-800">회원가입</h1>
            <p className="mt-1 text-sm text-slate-500">
              아래 정보를 입력해 계정을 생성하세요.
            </p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-5">
            <Input value={signId} onChange={({ target }) => setSignId(target.value)} label="아이디" placeholder="아이디를 입력하세요" />
            <Input value={username} onChange={({ target }) => setUsername(target.value)} label="이름" placeholder="이름을 입력하세요" />
            <Input value={email} onChange={({ target }) => setEmail(target.value)} label="이메일" placeholder="이메일을 입력하세요" type="email" />
            <Input value={password} onChange={({ target }) => setPassword(target.value)} label="비밀번호" placeholder="비밀번호를 입력하세요" type="password" />
            <Input value={password2} onChange={({ target }) => setPassword2(target.value)} label="비밀번호 확인" placeholder="비밀번호를 다시 입력하세요" type="password" />

            <ul className="text-xs text-slate-500 space-y-1">
              <li className={isEmailValid || !email ? "" : "text-red-500"}>• 유효한 이메일 형식</li>
              <li className={isPwLongEnough || !password ? "" : "text-red-500"}>• 비밀번호 8자 이상</li>
              <li className={isPwMatch || !password2 ? "" : "text-red-500"}>• 비밀번호 일치</li>
            </ul>

            {error && <p className="text-red-500 text-xs -mt-1">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full h-11 rounded-xl text-white text-sm font-medium transition shadow-sm ${isSubmitting
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-sky-400 to-blue-500 hover:shadow-md hover:brightness-105"
                }`}
            >
              {isSubmitting ? "처리 중..." : "회원가입"}
            </button>

            <div className="text-sm text-slate-600 text-center">
              이미 가입하셨나요?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="font-medium text-sky-700 hover:text-sky-800 underline"
              >
                로그인
              </button>
            </div>
          </form>
        </div>


      </div>
    </div>
  );
};

export default SignUp;
