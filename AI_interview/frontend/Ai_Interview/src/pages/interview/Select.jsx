import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import axiosInstance from "../../utils/axiosInstance";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { toast } from "react-hot-toast";

// ✅ 인터뷰 플로우 스토어 적용
import { useInterviewStore, STEPS } from "../../stores/interviewStore";

// ✅ 통일된 버튼 스타일
const btn = (variant = "primary") => {
  const base =
    "inline-flex items-center justify-center h-11 px-6 rounded-xl text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
  const primary = "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-300";
  const success = "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-300";
  return `${base} ${variant === "primary" ? primary : success}`;
};

export default function Select() {
  const nav = useNavigate();
  const token = useAuthStore((s) => s.token);
  const isAuth = !!token;
  const [loadingType, setLoadingType] = useState(null);

  // ▼ Zustand 액션
  const setInterviewNo = useInterviewStore((s) => s.setInterviewNo);
  const setInterviewTypeMeta = useInterviewStore((s) => s.setInterviewTypeMeta);
  const setStep = useInterviewStore((s) => s.setStep);
  const hydrateFromSession = useInterviewStore((s) => s.hydrateFromSession);

  // 새 탭/새로고침 진입 안정화
  useEffect(() => {
    hydrateFromSession();
  }, [hydrateFromSession]);

  const startMutation = useMutation({
    mutationFn: async (interviewType) => {
      // interviewType: 1(실전) | 2(모의)
      const { data } = await axiosInstance.post("/interviews/start", { interviewType });
      // onSuccess 두 번째 인자로 interviewType이 variables로 들어오니, 굳이 합치진 않아도 됨
      return data;
    },
    onMutate: (type) => setLoadingType(type),
    onSuccess: ({ interviewNo }, interviewType) => {
      if (interviewNo == null) throw new Error("인터뷰 번호를 받지 못했습니다.");

      // ✅ 스토어에만 반영 (sessionStorage 직접 접근 제거)
      setInterviewNo(interviewNo);
      setInterviewTypeMeta({
        type: interviewType,
        label: interviewType === 1 ? "실전 면접" : "모의 면접",
        color: interviewType === 1 ? "emerald" : "blue",
      });
      setStep(STEPS.UPLOAD);

      // ❌ questionTypes 저장/전파는 요구에 따라 제거
      // (기존 sessionStorage.setItem("questionTypes", ...) 삭제)

      // 필요하다면 레거시 호환 키 최소만 남기기 (선택)
      // try { sessionStorage.setItem("interviewTypeKey", interviewType === 1 ? "REAL" : "MOCK"); } catch {}

      nav("/interview/resume");
    },
    onError: (err) => {
      console.error(err);
      toast.error("인터뷰 시작에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    },
    onSettled: () => setLoadingType(null),
    retry: false,
  });

  const handleStart = (type) => {
    if (!isAuth) {
      toast.error("로그인이 필요합니다.", {
        icon: "🔐",
        duration: 2500,
        position: "top-center",
        style: {
          background: "#333",
          color: "#fff",
          borderRadius: "10px",
          fontSize: "14px",
        },
      });
      setTimeout(() => nav("/login"), 1200);
      return;
    }
    if (startMutation.isPending) return;
    startMutation.mutate(type);
  };

  return (
    <div className="min-h-screen w-full bg-[#F7FAFC]">
      <Header />

      <section className="bg-gradient-to-b from-white to-[#F7FAFC] border-b border-gray-100">
        <div className="max-w-[1200px] mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
            어떤 면접을 시작하시겠어요?
          </h1>
          <p className="mt-3 text-gray-600 text-[15px]">
            실제 면접처럼 긴장감을 느끼고 싶다면 <b>실전 면접</b>을,&nbsp;
            편하게 연습하고 싶다면 <b>모의 면접</b>을 선택하세요.
          </p>
        </div>
      </section>

      <main className="max-w-[1200px] mx-auto px-4 py-12 grid md:grid-cols-2 gap-10">
        {/* 실전 면접 카드 */}
        <Card gradient="from-emerald-50 via-white to-white">
          <CardHeader
            title="실전 면접"
            color="emerald"
            emoji="🔥"
            desc="실제 면접과 거의 동일한 환경에서 몰입형 시뮬레이션을 경험하세요."
          />

          <Divider />

          <ul className="space-y-2 text-sm text-gray-700 mt-4">
            <li>✔ 내 이력서를 기반으로 한 맞춤 질문</li>
            <li>✔ 다단계 평가 시스템과 결과 리포트</li>
            <li>✔ AI 기반 영상·음성 피드백 제공</li>
          </ul>

          <div className="mt-8 flex justify-end">
            <button
              onClick={() => handleStart(1)}
              disabled={loadingType === 1 || startMutation.isPending}
              className={btn("success")}
            >
              {loadingType === 1 ? <Spinner label="시작 중..." /> : "실전 면접 시작하기"}
            </button>
          </div>
        </Card>

        {/* 모의 면접 카드 */}
        <Card gradient="from-blue-50 via-white to-white">
          <CardHeader
            title="모의 면접"
            color="blue"
            emoji="🙂"
            desc="부담 없이 연습하고 AI의 피드백을 통해 실력을 키워보세요."
          />

          <Divider />

          <ul className="space-y-2 text-sm text-gray-700 mt-4">
            <li>✔ 자유로운 질문 선택과 답변 연습</li>
            <li>✔ 영상 분석을 통한 감정/시선 피드백</li>
            <li>✔ 반복 학습 리포트 및 성장 추적</li>
          </ul>

          <div className="mt-8 flex justify-end">
            <button
              onClick={() => handleStart(2)}
              disabled={loadingType === 2 || startMutation.isPending}
              className={btn("primary")}
            >
              {loadingType === 2 ? <Spinner label="시작 중..." /> : "면접 연습 시작하기"}
            </button>
          </div>
        </Card>
      </main>
    </div>
  );
}

/* -------------------- 컴포넌트 -------------------- */
function Card({ gradient, children }) {
  return (
    <section
      className={`p-10 rounded-3xl border border-gray-100 bg-gradient-to-br ${gradient}
        shadow-sm hover:shadow-md hover:border-gray-200 transition min-h-[440px] flex flex-col justify-between`}
    >
      {children}
    </section>
  );
}

function CardHeader({ title, emoji, desc, color = "blue" }) {
  const colorMap = {
    emerald: "text-emerald-600 bg-emerald-100 border-emerald-200",
    blue: "text-blue-600 bg-blue-100 border-blue-200",
  };
  return (
    <div className="flex items-center gap-4">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${colorMap[color]}`}>
        <span className="text-3xl">{emoji}</span>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-600">{desc}</p>
      </div>
    </div>
  );
}

function Divider() {
  return <hr className="mt-6 border-t border-gray-100" />;
}

function Spinner({ label = "로딩 중..." }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        ></path>
      </svg>
      <span>{label}</span>
    </span>
  );
}
