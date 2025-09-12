// src/pages/auth/SignUp.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../../components/inputs/Input";
import { validateEmail } from "../../utils/helper";

// ✅ 공통 axios 인스턴스/경로 사용
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const SignUp = () => {
  const [signId, setSignId] = useState("");
  const [username, setUsername] = useState("");   // 이름
  const [email, setEmail] = useState("");         // 이메일
  const [password, setPassword] = useState("");   // 비밀번호
  const [password2, setPassword2] = useState(""); // 비밀번호 확인
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();

    // 기본 유효성 검사
    if (!signId.trim()) return setError("아이디를 입력해 주세요");
    if (!username.trim()) return setError("이름을 입력해 주세요");
    if (!validateEmail(email)) return setError("올바른 이메일 주소를 입력해 주세요");
    if (!password || password.length < 8) return setError("비밀번호는 8자 이상 입력해 주세요");
    if (password !== password2) return setError("비밀번호가 일치하지 않습니다");
    setError("");

    const idTrim = signId.trim();
    const pwTrim = password.trim();
    const nameTrim = username.trim();
    const emailTrim = email.trim();

    try {
      // ✅ 회원가입: 서버가 기대하는 키(id, pw, name, email)로 정확히 전송
      const response = await axiosInstance.post(API_PATHS.AUTH.REGISTER, {
        id: idTrim,
        pw: pwTrim,
        name: nameTrim,
        email: emailTrim,
      });

      console.log("회원가입 성공:", response.data);

      // (선택) 바로 자동 로그인
      // 서버의 로그인 스펙이 { id, pw } 라면 아래 그대로 사용
      await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
        id: idTrim,
        pw: pwTrim,
      });

      alert("회원가입 및 자동 로그인이 완료되었습니다!");
      navigate("/"); // 또는 대시보드 경로
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
        "회원가입에 실패했습니다. 아이디/이메일 중복 여부를 확인하고 다시 시도해 주세요."
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] py-10">
      <div className="mx-auto max-w-md rounded-2xl bg-white border border-gray-200 shadow-sm p-8">
        <h2 className="text-lg font-semibold">회원가입</h2>

        <form onSubmit={handleSignUp} className="mt-6 space-y-5">
          <Input
            value={signId}
            onChange={({ target }) => setSignId(target.value)}
            label="아이디"
            placeholder="아이디를 입력하세요"
            type="text"
          />
          <Input
            value={username}
            onChange={({ target }) => setUsername(target.value)}
            label="이름"
            placeholder="이름을 입력하세요"
            type="text"
          />
          <Input
            value={email}
            onChange={({ target }) => setEmail(target.value)}
            label="이메일"
            placeholder="이메일을 입력하세요"
            type="email"
          />
          <Input
            value={password}
            onChange={({ target }) => setPassword(target.value)}
            label="비밀번호"
            placeholder="최소 8자리 이상 입력하세요"
            type="password"
          />
          <Input
            value={password2}
            onChange={({ target }) => setPassword2(target.value)}
            label="비밀번호 확인"
            placeholder="비밀번호를 다시 입력하세요"
            type="password"
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full px-5 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            회원가입
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
