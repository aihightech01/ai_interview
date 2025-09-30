// src/pages/interview/Select.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import axiosInstance from "../../utils/axiosInstance"; // 공용 axios 인스턴스

export default function Select() {
  const nav = useNavigate();
  const [loadingType, setLoadingType] = useState(null); // 1 | 2 | null

  // 공용 토큰 헬퍼: accessToken 또는 token 중 존재하는 값 사용
  const getToken = () =>
    localStorage.getItem("accessToken") || localStorage.getItem("token") || "";

  // 공통 시작 함수
  async function startInterview(interviewType) {
    try {
      setLoadingType(interviewType);

      // 로그인 여부 확인
      const token = getToken();
      if (!token) {
        alert("로그인이 필요합니다.");
        nav("/login");
        return;
      }

      // NOTE:
      // - axiosInstance.baseURL이 "/api"라면 이 경로는 "/api/interviews/start"로 전송됩니다.
      // - baseURL이 "http://localhost:8080"이라면 서버 라우트에 맞춰 "/api/interviews/start" 또는 "/interviews/start"로 조정하세요.
      const res = await axiosInstance.post(
        "/interviews/start",
        { interviewType } // 1=실전, 2=모의
        // 헤더/withCredentials는 axiosInstance 인터셉터/설정에 위임
      );

      // 응답: { interviewNo: number }
      const { interviewNo } = res?.data || {};
      if (!interviewNo && interviewNo !== 0) {
        throw new Error("인터뷰 번호를 받지 못했습니다.");
      }

      // 면접 동안 유지: 세션 스토리지에 저장
      sessionStorage.setItem("interviewNo", String(interviewNo));
      sessionStorage.setItem("interviewType", String(interviewType));

      // 다음 페이지로 이동
      nav("/interview/resume");
    } catch (err) {
      console.error(err);
      alert("인터뷰 시작에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoadingType(null);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#F7FAFC]">
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
              onClick={() => startInterview(1)}
              disabled={loadingType === 1}
              className="px-4 h-9 rounded bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-60"
            >
              {loadingType === 1 ? "시작 중..." : "실전 면접 시작하기"}
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
              <li>단계에 기반한 점수화 점검</li>
              <li>이전 리포트를 대비 성장 지표 제공</li>
            </ul>

            <button
              onClick={() => startInterview(2)}
              disabled={loadingType === 2}
              className="px-4 h-9 rounded bg-[#3B82F6] text-white text-sm hover:opacity-90 disabled:opacity-60"
            >
              {loadingType === 2 ? "시작 중..." : "면접 연습 시작하기"}
            </button>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
