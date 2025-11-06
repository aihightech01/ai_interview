// src/pages/LandingPage.jsx
import React from "react";
import { LuArrowRight, LuListChecks, LuVideo, LuBrain } from "react-icons/lu";
import Header from "../components/Header";
import {
  motion,
  MotionConfig,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";

/** 핵심 기능 */
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
    desc: "표정·시선·발화 속도 등 비언어 지표를 분석해 개선점을 제시합니다.",
    icon: <LuVideo className="w-6 h-6" />,
  },
  {
    id: 3,
    title: "맞춤 질문 추천",
    desc: "난이도/키워드 기반으로 꼭 필요한 질문만 추천합니다.",
    icon: <LuBrain className="w-6 h-6" />,
  },
];

/** 사용자 가이드(자소서 기반) */
const GUIDE_STEPS = [
  {
    no: "01",
    title: "자소서 업로드",
    desc: "PDF/텍스트를 업로드하면 문맥·경험을 바탕으로 핵심 키워드를 추출합니다.",
  },
  {
    no: "02",
    title: "자소서 기반 질문 생성",
    desc: "추출 키워드로 예상 질문 세트를 자동 구성하고, 필요시 직접 문항을 추가합니다.",
  },
  {
    no: "03",
    title: "면접 연습 기능",
    desc: "웹캠으로 실전처럼 답변을 녹화하고, 시간 흐름에 따른 지표를 함께 기록합니다.",
  },
  {
    no: "04",
    title: "분석 리포트 확인",
    desc: "시선·표정·발화 속도와 답변 요약을 통합 분석해 개선 포인트를 제시합니다.",
  },
];

/** 모션 프리셋 */
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};
const listStagger = {
  hidden: {},
  show: (delay = 0) => ({
    transition: { staggerChildren: 0.12, delayChildren: delay },
  }),
};

/** 미니 프리뷰 카드 (히어로 오른쪽) */
// 🧊 완전 심플 버전 PreviewCard.jsx
function PreviewCard() {
  return (
    <div
      aria-label="세션 미리보기 카드"
      className=""
    >




      {/* 하단 여백만 두고 마무리 */}
      <div className="" />
    </div>
  );
}
export default function LandingPage() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const blobY1 = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const blobY2 = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <MotionConfig reducedMotion="user">
      {/* 스킵 링크 (접근성) */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-white focus:rounded-lg focus:shadow"
      >
        본문으로 건너뛰기
      </a>

      <div className="min-h-screen text-gray-900 flex flex-col bg-[#F7F8FA] relative overflow-hidden">
        {/* 배경 블롭 */}
        <motion.div aria-hidden className="pointer-events-none absolute inset-0">
          <motion.div
            style={{ y: blobY1 }}
            className="absolute -top-40 -left-40 h-[420px] w-[420px] rounded-full blur-3xl opacity-40 bg-gradient-to-tr from-sky-200 to-blue-300"
          />
          <motion.div
            style={{ y: blobY2 }}
            className="absolute -bottom-48 -right-48 h-[520px] w-[520px] rounded-full blur-3xl opacity-30 bg-gradient-to-tr from-sky-100 to-blue-200"
          />
        </motion.div>

        <Header />

        <main
          id="main"
          className="flex-1 overflow-y-auto snap-y snap-proximity scroll-smooth"
        >
          {/* ===== HERO ===== */}
          <section className="snap-start min-h-screen flex items-center">
            <div className="mx-auto max-w-6xl px-4 grid md:grid-cols-2 gap-12 items-center">
              {/* Left copy */}
              <motion.div
                variants={listStagger}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-80px" }}
              >
                <motion.div
                  variants={fadeUp}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/70 backdrop-blur px-3 py-1 text-[12px] text-sky-700 shadow-sm"
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                  자소서 기반 면접 연습 · 분석 코칭
                </motion.div>

                <motion.h1
                  variants={fadeUp}
                  className="mt-4 text-5xl md:text-6xl font-extrabold leading-tight tracking-tight"
                >
                  당신의{" "}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-blue-700">
                    AI 면접 코치
                  </span>
                </motion.h1>

                <motion.p
                  variants={fadeUp}
                  className="mt-6 text-base md:text-lg text-gray-600 leading-relaxed"
                >
                  자소서의 키워드로 질문을 만들고, 영상 면접과 분석 리포트까지 한 흐름으로
                  제공합니다.
                </motion.p>

                <motion.div
                  variants={fadeUp}
                  className="mt-8 flex flex-wrap items-center gap-3"
                >
                  <motion.button
                    whileTap={{ scale: reduce ? 1 : 0.98 }}
                    whileHover={
                      reduce
                        ? {}
                        : {
                            y: -2,
                            boxShadow: "0 14px 32px rgba(2,132,199,.28)",
                          }
                    }
                    onClick={() => navigate("/interview/select")}
                    className="group inline-flex items-center gap-2 px-6 py-4 rounded-2xl text-white transition
                               bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800"
                  >
                    지금 바로 시작하기
                    <LuArrowRight className="transition -translate-x-0 group-hover:translate-x-0.5" />
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: reduce ? 1 : 0.98 }}
                    onClick={() =>
                      typeof window !== "undefined" &&
                      window.scrollTo({
                        top: window.innerHeight,
                        behavior: "smooth",
                      })
                    }
                    className="inline-flex items-center gap-2 px-5 py-4 rounded-2xl bg-white/70 backdrop-blur border border-gray-200 hover:border-gray-300 shadow-sm text-gray-700 transition"
                  >
                    기능 살펴보기
                  </motion.button>
                </motion.div>

                {/* 신뢰 배지 (간단형) */}
                <motion.div
                  variants={fadeUp}
                  className="mt-5 flex flex-wrap items-center gap-3 text-[11px] text-gray-500"
                >
                  <span className="px-2 py-1 rounded-md border border-gray-200 bg-white/70">
                    🔒 브라우저 내 실시간 분석
                  </span>
                  <span className="px-2 py-1 rounded-md border border-gray-200 bg-white/70">
                    🧪 리포트 자동 생성
                  </span>
                  <span className="px-2 py-1 rounded-md border border-gray-200 bg-white/70">
                    ⚡ 빠른 셋업
                  </span>
                </motion.div>
              </motion.div>

              {/* Right: preview */}
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.985 }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { duration: 0.6, ease: "easeOut" },
                }}
                viewport={{ once: true, margin: "-80px" }}
                className="relative"
              >
                <div className="absolute -inset-6 bg-gradient-to-tr from-sky-200/55 to-blue-200/55 blur-2xl rounded-[32px]" />
                <PreviewCard />
              </motion.div>
            </div>

            {/* 모바일 고정 CTA (히어로 섹션에서만) */}
            <div className="md:hidden fixed bottom-4 inset-x-4">
              <div className="rounded-2xl border border-sky-200 bg-white/90 backdrop-blur shadow-lg p-3 flex items-center justify-between">
                <div className="text-[12px] text-gray-600">
                  바로 연습하고 리포트 받아보세요
                </div>
                <button
                  onClick={() => navigate("/interview/select")}
                  className="px-4 py-2 rounded-xl text-white bg-gradient-to-r from-sky-600 to-blue-700 text-sm"
                >
                  시작
                </button>
              </div>
            </div>
          </section>

          {/* ===== 실전 대비 핵심 기능 ===== */}
          <section className="snap-start min-h-screen flex items-center bg-white">
            <div className="mx-auto max-w-6xl px-4 w-full">
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.55 },
                }}
                viewport={{ once: true }}
                className="text-3xl md:text-4xl font-bold text-center tracking-tight"
              >
                실전 대비 핵심 기능
              </motion.h2>
              <p className="mt-3 text-center text-gray-600">
                질문 구성 → 영상 면접 → 분석 리포트까지 한 흐름
              </p>

              <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                {FEATURES.map((f, idx) => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, scale: 0.96, y: 20 }}
                    whileInView={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      transition: {
                        type: "spring",
                        stiffness: 140,
                        damping: 18,
                        delay: idx * 0.06,
                      },
                    }}
                    viewport={{ once: true, margin: "-80px" }}
                    className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                  >
                    {/* 상단 리빌 라인 */}
                    <motion.span
                      initial={{ x: "-100%" }}
                      whileInView={{
                        x: 0,
                        transition: {
                          duration: 0.7,
                          ease: "easeOut",
                          delay: idx * 0.06,
                        },
                      }}
                      viewport={{ once: true }}
                      className="absolute left-0 top-0 h-[3px] w-full bg-gradient-to-r from-sky-500 to-blue-600"
                    />
                    <div className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-gray-100 text-gray-700">
                          {f.icon}
                        </div>
                        <h3 className="font-semibold">{f.title}</h3>
                      </div>
                      <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                        {f.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ===== 사용자 가이드 ===== */}
          <section className="snap-start py-20 bg-[#F4F7FB]">
            <div className="mx-auto max-w-6xl px-4 w-full">
              <h2 className="text-2xl md:text-3xl font-semibold mb-6 tracking-tight">
                사용자 가이드
              </h2>
              <p className="text-gray-600 mb-6">
                자소서 기반으로 질문을 생성하고, 영상 면접과 분석 리포트를 통해 빠르게
                개선하세요.
              </p>

              <motion.ol
                variants={listStagger}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-80px" }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {GUIDE_STEPS.map(({ no, title, desc }, i) => (
                  <motion.li
                    key={no}
                    variants={fadeUp}
                    whileHover={
                      reduce ? {} : { y: -2, boxShadow: "0 20px 44px rgba(2,6,23,.08)" }
                    }
                    className="relative rounded-2xl bg-white border border-gray-200 p-6 shadow-sm overflow-hidden"
                  >
                    {/* 번호 배지 */}
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      whileInView={{
                        scale: 1,
                        opacity: 1,
                        transition: { delay: 0.1 + i * 0.05 },
                      }}
                      viewport={{ once: true }}
                      className="inline-flex h-7 w-10 items-center justify-center rounded-md bg-sky-50 text-sky-700 text-sm font-semibold"
                    >
                      {no}
                    </motion.div>

                    {/* 타이틀 + 언더라인 */}
                    <div className="mt-1">
                      <h3 className="text-xl font-semibold">{title}</h3>
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{
                          width: "64px",
                          transition: { duration: 0.6, ease: "easeOut" },
                        }}
                        viewport={{ once: true }}
                        className="h-[3px] rounded-full bg-gradient-to-r from-sky-500 to-blue-600 mt-2"
                      />
                    </div>

                    <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                      {desc}
                    </p>

                    {/* 모서리 글로우 */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full blur-2xl bg-sky-200/30"
                    />
                  </motion.li>
                ))}
              </motion.ol>
            </div>
          </section>


          <Footer />
        </main>
      </div>
    </MotionConfig>
  );
}
