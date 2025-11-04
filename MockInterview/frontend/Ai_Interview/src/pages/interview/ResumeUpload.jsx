// src/pages/resume/ResumeUploadPage.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import { useAuthStore } from "../../stores/authStore";
import { motion, useReducedMotion } from "framer-motion";

export default function ResumeUploadPage() {
  const nav = useNavigate();

  // ===== 업로드 전용 axios (mock 미장착) =====
  const uploadAxios = axios.create({
    baseURL: "/api", // 프록시 사용 시 /api, 직접 호출이면 "http://localhost:8080"
    withCredentials: false,
    // timeout: 180000,
  });

  const token = useAuthStore((s) => s.token); // ✅ Zustand에서 토큰 읽기

  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);

  // 입력 보관 전용(서버에 즉시 안 보냄)
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);

  const [interviewNo, setInterviewNo] = useState("");

  // 로딩 상태
  const [loading, setLoading] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // UI용 면접 유형 표시
  const [interviewType, setInterviewType] = useState(null);             // 1 | 2
  const [interviewTypeLabel, setInterviewTypeLabel] = useState("");     // "실전 면접" | "모의 면접"
  const [interviewTypeColor, setInterviewTypeColor] = useState("blue"); // "emerald" | "blue"

  useEffect(() => {
    const no = sessionStorage.getItem("interviewNo") || "";
    if (!no) {
      alert("면접 세션이 없습니다. 면접 선택 페이지에서 다시 시작해 주세요.");
      nav("/interview/select");
      return;
    }
    setInterviewNo(no);

    const typeStr = sessionStorage.getItem("interviewType");
    if (typeStr) {
      const t = Number(typeStr);
      setInterviewType(t);
      setInterviewTypeLabel(
        sessionStorage.getItem("interviewTypeLabel") || (t === 1 ? "실전 면접" : "모의 면접")
      );
      setInterviewTypeColor(
        sessionStorage.getItem("interviewTypeColor") || (t === 1 ? "emerald" : "blue")
      );
    }
  }, [nav]);

  const titleEmpty = title.trim() === "";
  const ensureTitleOrFocus = () => {
    if (titleEmpty) {
      setTitleTouched(true);
      return false;
    }
    return true;
  };

  function logFormData(fd) {
    const entries = [];
    for (const [k, v] of fd.entries()) {
      entries.push([k, v instanceof File ? `(File) ${v.name} (${v.type}, ${v.size}B)` : String(v)]);
    }
    console.log("[ResumeUpload] sending FormData:", entries);
  }

  /**
   * 최종 제출(질문 생성 버튼)에서만 서버 호출
   * - 자소서 파일/텍스트가 없어도 제목만 보내서 저장되도록 허용
   */
  async function onGenerateList() {
    if (!interviewNo) {
      alert("면접 세션이 없습니다. 면접 선택 페이지에서 다시 시작해 주세요.");
      nav("/interview/select");
      return;
    }
    if (!ensureTitleOrFocus()) return;

    const fd = new FormData();
    fd.append("interviewTitle", title.trim());
    fd.append("textContent", (text ?? "").trim());
    if (file instanceof File) {
      fd.append("resumeFile", file);
    }

    logFormData(fd);

    const url = `/resumes/upload/${encodeURIComponent(interviewNo)}`;

    try {
      setLoading(true);

      const { data } = await uploadAxios.post(url, fd, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
          // Content-Type 지정 금지
        },
      });

      if (!data || data.message !== true) {
        console.error("[ResumeUpload] unexpected response:", data);
        throw new Error("업로드 응답이 올바르지 않습니다.");
      }

      nav("/interview/questions", { replace: true });
    } catch (err) {
      console.error("[ResumeUpload] upload error:", {
        url,
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        data: err?.response?.data,
      });
      alert(
        `업로드에 실패했습니다.\n` +
        (err?.response?.status ? `상태코드: ${err.response.status}\n` : "") +
        `콘솔 로그를 확인해주세요.`
      );
    } finally {
      setLoading(false);
    }
  }

  // ===== 커스텀 파일 버튼 (기본 "선택된 파일 없음" 숨김) =====
  const fileInputRef = useRef(null);
  function onFileChange(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    // 기본 텍스트 노출 방지: 실제 input은 숨겨져 있고, 상태만 갱신
  }
  function openFileDialog() {
    fileInputRef.current?.click();
  }

  const generateBtnLabel = useMemo(() => (loading ? "생성 중..." : "질문 리스트 생성"), [loading]);

  return (
    <div className="min-h-screen w-full bg-[#F7FAFC] flex flex-col relative">
      {/* 상단 고정 Header */}
      <Header />

      {/* === 로딩 오버레이: 더 투명한 글라스 + 파스텔 브리딩 + 오비터 === */}
      {loading && (
        <motion.div
          className="absolute inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          aria-live="polite"
        >
          {/* Glass backdrop: 투명도↓ */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/45 via-white/22 to-white/12 backdrop-blur-md" />

          {/* Soft vignette: 더 넓게, 더 약하게 */}
          <div className="absolute inset-0 pointer-events-none bg-slate-900/8 [mask-image:radial-gradient(120%_90%_at_50%_45%,black_55%,transparent_100%)]" />

          {/* Grain texture: 더 미세하게 */}
          <div className="absolute inset-0 opacity-10 mix-blend-soft-light [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%22240%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22240%22 height=%22240%22 filter=%22url(%23n)%22 fill=%22%23ffffff%22 opacity=%220.035%22/></svg>')]" />

          {/* Glass card: 투명도↓ */}
          <motion.div
            aria-label="생성 중"
            role="status"
            className="relative flex flex-col items-center gap-3 px-6 py-5 rounded-2xl bg-white/30 border border-white/50 shadow-[0_10px_45px_-12px_rgba(2,6,23,0.16)]"
            initial={prefersReducedMotion ? false : { y: 8, scale: 0.985 }}
            animate={prefersReducedMotion ? undefined : { y: [8, 0, 8], scale: [0.985, 1, 0.985] }}
            transition={prefersReducedMotion ? undefined : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Pastel breathing loader with orbiter */}
            <motion.div
              className="relative"
              initial={false}
              animate={
                prefersReducedMotion
                  ? { opacity: [0.85, 1, 0.85] }
                  : { opacity: [0.85, 1, 0.85], scale: [0.995, 1, 0.995] }
              }
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            >
              <motion.svg
                width="56"
                height="56"
                viewBox="0 0 56 56"
                className="block"
                // svg 전체를 회전시킬 때도 원점 고정
                style={{ transformBox: "fill-box", transformOrigin: "28px 28px" }}
                animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                transition={
                  prefersReducedMotion ? undefined : { duration: 16, repeat: Infinity, ease: "linear" }
                }
              >
                <defs>
                  <linearGradient id="lgA" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#c7ddff" />
                    <stop offset="100%" stopColor="#e3d7ff" />
                  </linearGradient>
                  <linearGradient id="lgB" x1="1" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dff3ff" />
                    <stop offset="100%" stopColor="#ffe9f2" />
                  </linearGradient>
                  <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* 베이스 링 */}
                <circle cx="28" cy="28" r="18" fill="none" stroke="#eaeef7" strokeWidth="4" />

                {/* Arc 1 */}
                <motion.circle
                  cx="28"
                  cy="28"
                  r="18"
                  fill="none"
                  stroke="url(#lgA)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="24 100"
                  filter="url(#softGlow)"
                  // ★ 원점 고정
                  style={{ transformBox: "fill-box", transformOrigin: "28px 28px" }}
                  animate={
                    prefersReducedMotion
                      ? { strokeDashoffset: [0, -24, 0] }
                      : { strokeDashoffset: [0, -24, 0], rotate: 360 }
                  }
                  transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Arc 2 */}
                <motion.circle
                  cx="28"
                  cy="28"
                  r="18"
                  fill="none"
                  stroke="url(#lgB)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="18 100"
                  filter="url(#softGlow)"
                  // ★ 원점 고정
                  style={{ transformBox: "fill-box", transformOrigin: "28px 28px" }}
                  animate={
                    prefersReducedMotion
                      ? { strokeDashoffset: [0, 18, 0], opacity: [0.35, 0.75, 0.35] }
                      : { strokeDashoffset: [0, 18, 0], rotate: -360, opacity: [0.35, 0.75, 0.35] }
                  }
                  transition={{ duration: 3.0, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                />

                {/* Orbiter */}
                {!prefersReducedMotion && (
                  <motion.g
                    // ★ 원점 고정
                    style={{ transformBox: "fill-box", transformOrigin: "28px 28px" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 5.2, repeat: Infinity, ease: "linear" }}
                  >
                    <circle cx="28" cy="10" r="2.4" fill="#c7ddff" />
                    <circle cx="28" cy="10" r="5.6" fill="none" stroke="#c7ddff55" strokeWidth="0.6" />
                  </motion.g>
                )}
              </motion.svg>
            </motion.div>

            <div className="text-sm text-slate-800 font-medium">질문을 생성하고 있어요…</div>
            <div className="text-xs text-slate-500">보통 5~10초 내에 완료됩니다</div>
          </motion.div>
        </motion.div>
      )}

      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-4 py-10">
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
            <div className="p-6">
              {/* 제목 + 면접 유형 뱃지 같은 줄 */}
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold">인터뷰 제목</h1>

                {interviewType && (
                  <div className="flex items-center gap-2">
                    <span className={chipCls(interviewTypeColor)}>{interviewTypeLabel}</span>
                    <button
                      type="button"
                      onClick={() => !loading && nav("/interview/select")}
                      className={`text-xs ${loading ? "text-slate-400" : "text-blue-600 hover:underline"}`}
                      disabled={loading}
                    >
                      변경
                    </button>
                  </div>
                )}
              </div>

              <input type="hidden" name="interviewNo" value={interviewNo} />
              <input
                type="text"
                className={`mt-3 w-full max-w-[560px] h-10 px-3 rounded-lg border text-sm outline-none transition
                ${titleTouched && titleEmpty
                    ? "border-red-500 ring-1 ring-red-200"
                    : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  }`}
                placeholder="예) 신입 백엔드 개발자 면접 (자소서 기반)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setTitleTouched(true)}
                disabled={loading}
              />
              {titleTouched && titleEmpty && (
                <p className="mt-1 text-xs text-red-600">제목을 입력 해주세요</p>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 좌측: 입력 패널 */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-6">
                <h1 className="text-lg font-semibold">자소서 업로드</h1>

                <div className="mt-4 rounded-xl border border-slate-200 p-5">
                  <p className="text-xs text-gray-500 mb-4">
                    파일을 선택해도 즉시 업로드하지 않습니다.
                    <br />
                    PDF/DOCX/텍스트 파일 · 최대 <b>10MB</b>
                  </p>

                  {/* 숨긴 실제 input */}
                  <input
                    ref={fileInputRef}
                    id="resumeFileInput"
                    type="file"
                    name="resumeFile"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => onFileChange(e)}
                    disabled={loading}
                    className="sr-only"
                    aria-hidden="true"
                  />

                  {/* 커스텀 버튼 (기본 '선택된 파일 없음' 텍스트 제거) */}
                  <button
                    type="button"
                    onClick={openFileDialog}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 shadow-sm disabled:opacity-50"
                  >
                    파일 선택
                  </button>

                  {/* 파일 선택 시에만 파일명 칩 표시 (없을 땐 아무것도 표시 안 함) */}
                  {file && (
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-700 shadow-sm w-fit">
                      {/* 파일 이름 */}
                      <span className="truncate max-w-[220px] text-gray-700">
                        {file.name}
                      </span>

                      {/* 휴지통 버튼 */}
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        aria-label="선택 파일 지우기"
                        title="선택 파일 지우기"
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <path d="M9 3a1 1 0 00-1 1v1H4.5a.5.5 0 000 1H5v13a2 2 0 002 2h10a2 2 0 002-2V6h.5a.5.5 0 000-1H16V4a1 1 0 00-1-1H9zm1 2h4V4h-4v1zm-2 2h8v13a1 1 0 01-1 1H8a1 1 0 01-1-1V7zm3 2a.5.5 0 01.5.5v8a.5.5 0 11-1 0v-8A.5.5 0 0111 9zm4 0a.5.5 0 01.5.5v8a.5.5 0 11-1 0v-8a.5.5 0 01.5-.5z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 p-5">
                  <p className="text-xs text-gray-500 mb-2">또는 텍스트 붙여넣기</p>
                  <textarea
                    className="w-full h-40 rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="자소서 텍스트 붙여넣기"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={loading}
                  />
                  <p className="mt-2 text-[11px] text-slate-500">
                    ※ 텍스트/파일 모두 선택 사항입니다. 제목만으로도 질문을 생성할 수 있어요.
                  </p>
                </div>
              </div>
            </section>

            {/* 우측: 목업 + 생성 버튼 */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="p-6">
                {/* === SVG: 둥실-글로우 + 패럴랙스 유지 === */}
                <motion.div
                  className="w-full h-[420px] border border-slate-200 rounded-lg flex items-center justify-center bg-gradient-to-b from-slate-50 to-white overflow-hidden relative"
                  initial={false}
                >
                  <div className="absolute inset-0 pointer-events-none [box-shadow:inset_0_0_0_1px_rgba(2,132,199,0.06)]" />
                  <div className="absolute -inset-10 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(99,102,241,0.12),transparent),radial-gradient(40%_30%_at_80%_80%,rgba(59,130,246,0.10),transparent)]" />

                  {!prefersReducedMotion && (
                    <>
                      <motion.div
                        className="absolute w-60 h-60 rounded-[40%_60%_50%_50%/40%_40%_60%_60%] bg-blue-300/25 blur-2xl"
                        style={{ left: "8%", top: "12%" }}
                        animate={{ y: [0, -10, 0], x: [0, 6, 0], borderRadius: ["40% 60% 50% 50%/40% 40% 60% 60%", "45% 55% 50% 50%/45% 35% 65% 55%", "40% 60% 50% 50%/40% 40% 60% 60%"] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <motion.div
                        className="absolute w-72 h-72 rounded-[55%_45%_40%_60%/55%_45%_55%_45%] bg-indigo-300/20 blur-2xl"
                        style={{ right: "6%", bottom: "10%" }}
                        animate={{ y: [0, 12, 0], x: [0, -8, 0], borderRadius: ["55% 45% 40% 60%/55% 45% 55% 45%", "50% 50% 45% 55%/60% 40% 40% 60%", "55% 45% 40% 60%/55% 45% 55% 45%"] }}
                        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                      />
                    </>
                  )}

                  <motion.svg
                    viewBox="0 0 480 360"
                    className="w-[90%] h-[90%] max-w-[520px] max-h-[360px] relative"
                    aria-label="AI 모의 면접 일러스트"
                    animate={prefersReducedMotion ? {} : { y: [0, -6, 0], rotate: [0, 0.8, 0] }}
                    transition={prefersReducedMotion ? undefined : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#60A5FA" />
                        <stop offset="100%" stopColor="#A78BFA" />
                      </linearGradient>
                      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EEF2FF" />
                        <stop offset="100%" stopColor="#E0F2FE" />
                      </linearGradient>
                      <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.12" />
                      </filter>
                    </defs>

                    <circle cx="90" cy="70" r="40" fill="url(#g2)" />
                    <circle cx="410" cy="80" r="30" fill="url(#g2)" />
                    <circle cx="420" cy="260" r="36" fill="url(#g2)" />
                    <circle cx="70" cy="270" r="28" fill="url(#g2)" />

                    <rect x="60" y="230" width="360" height="14" rx="7" fill="#E5E7EB" />
                    <rect x="60" y="242" width="360" height="6" rx="3" fill="#D1D5DB" />

                    <g filter="url(#softShadow)">
                      <circle cx="140" cy="150" r="26" fill="#93C5FD" />
                      <rect x="112" y="178" width="56" height="44" rx="10" fill="#BFDBFE" />
                      <rect x="120" y="230" width="40" height="12" rx="6" fill="#93C5FD" />
                    </g>
                    <g filter="url(#softShadow)">
                      <circle cx="340" cy="140" r="24" fill="#C4B5FD" />
                      <rect x="314" y="166" width="52" height="40" rx="10" fill="#DDD6FE" />
                      <rect x="322" y="230" width="36" height="12" rx="6" fill="#C4B5FD" />
                    </g>

                    <g filter="url(#softShadow)">
                      <rect x="190" y="150" width="100" height="64" rx="12" fill="white" stroke="#E2E8F0" />
                      <polyline
                        points="198,180 210,176 222,184 234,170 246,186 258,176 270,182 282,174 290,178"
                        fill="none" stroke="url(#g1)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                      />
                    </g>

                    <g filter="url(#softShadow)">
                      <rect x="108" y="96" width="120" height="32" rx="10" fill="white" stroke="#E5E7EB" />
                      <circle cx="118" cy="112" r="4" fill="#60A5FA" />
                      <rect x="126" y="106" width="92" height="12" rx="6" fill="#E5E7EB" />
                    </g>
                    <g filter="url(#softShadow)">
                      <rect x="264" y="96" width="120" height="32" rx="10" fill="white" stroke="#E5E7EB" />
                      <circle cx="274" cy="112" r="4" fill="#A78BFA" />
                      <rect x="282" y="106" width="92" height="12" rx="6" fill="#E5E7EB" />
                    </g>

                    {!prefersReducedMotion && (
                      <motion.polyline
                        points="80,300 160,290 240,300 320,292 400,300"
                        fill="none" stroke="url(#g1)" strokeWidth="2" strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0.0 }}
                        animate={{ pathLength: [0, 1], opacity: [0.0, 0.25] }}
                        transition={{ duration: 2.2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.6 }}
                      />
                    )}
                  </motion.svg>
                </motion.div>
              </div>

              <div className="px-6 pb-6">
                <motion.button
                  type="button"
                  onClick={onGenerateList}
                  disabled={loading || titleEmpty}
                  className={`inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${titleEmpty ? "bg-slate-400" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  whileTap={loading ? undefined : { scale: 0.98 }}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="size-4 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                      생성 중…
                    </span>
                  ) : (
                    generateBtnLabel
                  )}
                </motion.button>
                {titleEmpty && (
                  <p className="mt-2 text-xs text-red-600">제목을 먼저 입력해 주세요.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

/* === helper: 칩 스타일 === */
function chipCls(color = "blue") {
  const map = {
    emerald:
      "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200",
    blue:
      "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200",
  };
  return map[color] || map.blue;
}
