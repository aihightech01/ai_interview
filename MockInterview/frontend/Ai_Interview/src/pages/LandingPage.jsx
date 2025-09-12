// src/pages/LandingPage.jsx
import React from "react";
import { LuArrowRight, LuListChecks, LuVideo, LuBrain } from "react-icons/lu";
import Header from "../components/Header"; // 경로 확인: src/pages ↔ src/components
import { useNavigate } from "react-router-dom";

const FEATURES = [
  {
    id: 1,
    title: "나만의 질문 리스트로 연습",
    desc: "직무/자소서/직접 입력 질문을 묶어 실전처럼 연습합니다.",
    icon: <LuListChecks className="w-6 h-6" />,
  },
  {
    id: 2,
    title: "영상 분석 피드백",
    desc: "표정, 시선, 말 속도 등 비언어 지표를 분석해 개선점을 제시합니다.",
    icon: <LuVideo className="w-6 h-6" />,
  },
  {
    id: 3,
    title: "맞춤 질문 추천",
    desc: "직무/난이도/키워드 기반으로 꼭 필요한 질문만 추천합니다.",
    icon: <LuBrain className="w-6 h-6" />,
  },
];

export default function LandingPage() {
    const navigate = useNavigate();
  return (
    <div className="h-screen bg-[#F7F8FA] text-gray-900 flex flex-col">
      {/* 전역 AuthContext를 구독하는 Header */}
      <Header />

      {/* Scroll-snap body: 한 화면에 한 섹션 */}
      <main className="flex-1 overflow-y-auto snap-y snap-mandatory">
        {/* HERO */}
        <section className="snap-start min-h-screen flex items-center">
          <div className="mx-auto max-w-6xl px-4 grid md:grid-cols-2 gap-10 items-center">
            {/* Left: copy */}
            <div>
              <h1 className="text-5xl md:text-5xl font-extrabold leading-tight">
                당신의 <span className="text-blue-600">AI 면접 코치</span>
              </h1>
              <p className="mt-6 text-lg text-gray-600">
                질문 선택부터 영상 분석까지, 실전 환경과 가장 유사하게 연습하고
                즉시 피드백을 확인하세요.
              </p>
              <div className="mt-10">
                <button
                  onClick={() => navigate("/interview/select")}
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                >
                  지금 바로 시작하기 <LuArrowRight />
                </button>
              </div>
            </div>

            {/* Right: 미니멀 프리뷰 박스 (아이콘 제거) */}
            <div className="relative">
              {/* 그라데이션 글로우 */}
              <div className="absolute -inset-6 bg-gradient-to-tr from-blue-200/40 to-purple-200/40 blur-2xl rounded-[32px]" />
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="snap-start min-h-screen flex items-center bg-white">
          <div className="mx-auto max-w-6xl px-4 w-full">
            <h2 className="text-3xl md:text-4xl font-bold text-center">
              실전 대비 핵심 기능
            </h2>
            <p className="mt-3 text-center text-gray-600">
              질문 구성 → 면접 진행 → 분석 리포트까지 한 흐름으로 빠르게
            </p>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div
                  key={f.id}
                  className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gray-100 text-gray-700">
                      {f.icon}
                    </div>
                    <h3 className="font-semibold">{f.title}</h3>
                  </div>
                  <p className="mt-3 text-sm text-gray-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* USER GUIDE / TUTORIAL */}
        <section className="snap-start min-h-screen flex items-center bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 w-full">
            <h2 className="text-2xl md:text-3xl font-semibold mb-8">
              사용자 가이드
            </h2>

            <ol className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <li className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                <p className="text-xs font-medium text-blue-600">STEP 1</p>
                <h3 className="mt-2 font-semibold">자소서 업로드</h3>
                <p className="mt-2 text-sm text-gray-600">
                  PDF/텍스트로 자소서를 업로드하면 핵심 키워드를 추출합니다.
                </p>
              </li>
              <li className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                <p className="text-xs font-medium text-blue-600">STEP 2</p>
                <h3 className="mt-2 font-semibold">질문 자동 생성</h3>
                <p className="mt-2 text-sm text-gray-600">
                  생성된 질문 중 <span className="font-semibold">최대 3개</span>
                  를 선택하세요.
                </p>
              </li>
              <li className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                <p className="text-xs font-medium text-blue-600">STEP 3</p>
                <h3 className="mt-2 font-semibold">모의 면접 촬영</h3>
                <p className="mt-2 text-sm text-gray-600">
                  웹캠으로 답변 영상을 촬영합니다. 네트워크/마이크를 사전
                  점검하세요.
                </p>
              </li>
              <li className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                <p className="text-xs font-medium text-blue-600">STEP 4</p>
                <h3 className="mt-2 font-semibold">분석 리포트 확인</h3>
                <p className="mt-2 text-sm text-gray-600">
                  시선·표정·발화 속도 등 비언어 지표와 답변 요약 피드백을
                  제공합니다.
                </p>
              </li>
            </ol>
          </div>
        </section>

        {/* FOOTER (풀스크린 유지) */}
        <section className="snap-start min-h-screen flex items-center justify-center border-t border-gray-100 bg-white">
          <footer className="text-center text-xs text-gray-500 px-4">
            © {new Date().getFullYear()} AI 면접 코치. All rights reserved.
          </footer>
        </section>
      </main>
    </div>
  );
}
