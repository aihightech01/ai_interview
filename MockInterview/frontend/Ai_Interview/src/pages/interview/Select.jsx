// src/pages/interview/Select.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header"; // ✅ 헤더 컴포넌트 가져오기 (경로는 프로젝트 구조에 맞게)
import Footer from "../../components/Footer";

export default function Select() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen w-full bg-[#F7FAFC]">
      {/* ✅ 재귀 방지: 로컬 Header 함수 삭제하고, 가져온 Header 사용 */}
      <Header />

      <main className="max-w-[1200px] mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* 실전 면접 카드 */}
          <section className="p-8 rounded-2xl border bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-6">실전 면접</h2>

            <div className="w-24 h-24 rounded-full bg-green-100 border border-green-200 shadow-inner
                            flex items-center justify-center text-3xl font-bold text-green-600 mb-6">
              A+
            </div>

            <ul className="space-y-1.5 text-sm text-gray-700 mb-8">
              <li>실제 면접과 유사한 환경에서의 면접 연습</li>
              <li>다양한 면접 유형에 대한 연습 기회 제공</li>
              <li>나의 이력서를 기반으로 한 면접 시뮬레이션</li>
              <li>단계에 기반한 점수화 점검</li>
              <li>AI 분석을 통한 맞춤형 피드백 제공</li>
              <li>종합 리포트 및 면접 결과 가능성 제공</li>
            </ul>

            <button
              onClick={() => nav("/interview/resume")}
              className="px-4 h-9 rounded bg-green-600 text-white text-sm hover:bg-green-700"
            >
              실전 면접 시작하기
            </button>
          </section>

          {/* 모의 면접 카드 */}
          <section className="p-8 rounded-2xl border bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-6">모의 면접</h2>

            <div className="w-24 h-24 rounded-full bg-blue-100 border border-blue-200 shadow-inner
                            flex items-center justify-center text-3xl mb-6">
              🙂
            </div>

            <ul className="space-y-1.5 text-sm text-gray-700 mb-8">
              <li>다양한 면접 유형에 대한 연습 기회 제공</li>
              <li>나의 이력서를 기반으로 한 면접 시뮬레이션</li>
              <li>AI 분석을 통한 영상·음성 피드백 제공</li>
              <li>훈련 리포트 및 면접 결과 가능성 제공</li>
            </ul>

            <button
              onClick={() => nav("/interview/resume")}
              className="px-4 h-9 rounded bg-[#3B82F6] text-white text-sm hover:opacity-90"
            >
              면접 연습 시작하기
            </button>
          </section>
        </div>
      </main>
     <Footer/>
    </div>
  );
}
