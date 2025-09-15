// src/pages/resume/ResumeUploadPage.jsx
import React, { useRef, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useNavigate } from "react-router-dom";
import AppHeader from "../../components/Header";
import Footer from "../../components/Footer";

<Footer />

export default function ResumeUploadPage() {
  const nav = useNavigate();

  // 제목
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);

  // 파일/텍스트/로딩
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);

  const titleEmpty = title.trim() === "";
  const ensureTitleOrFocus = () => {
    if (titleEmpty) {
      setTitleTouched(true);
      return false;
    }
    return true;
  };

  async function onUploadText() {
    if (!ensureTitleOrFocus() || !text) return;
    setLoading(true);
    try {
      const { data } = await axiosInstance.post(API_PATHS.RESUME.TEXT, { text });
      await axiosInstance.post(API_PATHS.RESUME.FROM_RESUME, {
        resumeId: data.resumeId,
        topK: 10,
      });
      nav("/interview/questions");
    } finally {
      setLoading(false);
    }
  }

  async function onUploadFile(selectedFile) {
    if (!ensureTitleOrFocus() || !selectedFile) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      const { data } = await axiosInstance.post(API_PATHS.RESUME.UPLOAD, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await axiosInstance.post(API_PATHS.RESUME.FROM_RESUME, {
        resumeId: data.resumeId,
        topK: 10,
      });
      nav("/interview/questions");
    } finally {
      setLoading(false);
    }
  }

  function onGenerateList() {
    if (!ensureTitleOrFocus()) return;
    nav("/interview/questions");
  }

  return (
    <div className="min-h-screen w-full bg-[#F7FAFC] flex flex-col">
      <AppHeader />

      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-4 py-10">

          
          {/* ✅ 제목도 동일 카드 UI로 */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
            <div className="p-6">
              <h1 className="text-lg font-semibold mb-2">인터뷰 제목</h1>
              <input
                type="text"
                className={`w-full max-w-[560px] h-10 px-3 rounded-lg border text-sm outline-none transition
                ${titleTouched && titleEmpty
                  ? "border-red-500 ring-1 ring-red-200"
                  : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"}`}
                placeholder="예) 신입 백엔드 개발자 면접 (자소서 기반)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setTitleTouched(true)}
              />
              {titleTouched && titleEmpty && (
                <p className="mt-1 text-xs text-red-600">제목을 입력 해주세요</p>
              )}
            </div>
          </section>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 좌측 카드: 자소서 업로드 */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-6">
                <h1 className="text-lg font-semibold">자소서 업로드</h1>

                {/* 파일 업로드 카드 */}
                <div className="mt-4 rounded-xl border border-slate-200 p-5">
                  <p className="text-xs text-gray-500 mb-4">
                    “자소서 파일을 끌어다 놓으세요”
                    <br />
                    PDF/DOCX/텍스트 파일 · 최대 <b>10MB</b>
                  </p>

                  {/* 숨김 input + '파일 선택'(선택 즉시 업로드) */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setFile(f);
                      if (f) onUploadFile(f);
                    }}
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                    >
                      파일 선택
                    </button>
                    <span className="text-sm text-slate-500">
                      {file ? `선택된 파일: ${file.name}` : "선택된 파일 없음"}
                    </span>
                  </div>
                </div>

                {/* 텍스트 붙여넣기 카드 */}
                <div className="mt-4 rounded-xl border border-slate-200 p-5">
                  <p className="text-xs text-gray-500 mb-2">또는 텍스트 붙여넣기</p>
                  <textarea
                    className="w-full h-40 rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="자소서 텍스트 붙여넣기"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <div className="mt-3">
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-600 px-4 text-sm font-medium text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
                      disabled={!text || loading}
                      onClick={onUploadText}
                    >
                      {loading ? "업로드 중..." : "텍스트 업로드"}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* 우측 카드: 일러스트 + 액션 (제목만 남기고 '이미지 영역' 텍스트 제거) */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="p-6">
                {/* ← '이미지 영역' 텍스트 삭제 */}
                <div className="w-full h-[420px] border border-slate-200 rounded-lg flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
                  {/* 인라인 SVG 일러스트 */}
                  <svg
                    viewBox="0 0 480 360"
                    className="w-[90%] h-[90%] max-w-[520px] max-h-[360px]"
                    aria-label="AI 모의 면접 일러스트"
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
                    </defs>

                    <circle cx="90" cy="70" r="40" fill="url(#g2)" />
                    <circle cx="410" cy="80" r="30" fill="url(#g2)" />
                    <circle cx="420" cy="260" r="36" fill="url(#g2)" />
                    <circle cx="70" cy="270" r="28" fill="url(#g2)" />

                    <rect x="60" y="230" width="360" height="14" rx="7" fill="#E5E7EB" />
                    <rect x="60" y="242" width="360" height="6" rx="3" fill="#D1D5DB" />

                    <circle cx="140" cy="150" r="26" fill="#93C5FD" />
                    <rect x="112" y="178" width="56" height="44" rx="10" fill="#BFDBFE" />
                    <rect x="120" y="230" width="40" height="12" rx="6" fill="#93C5FD" />

                    <circle cx="340" cy="140" r="24" fill="#C4B5FD" />
                    <rect x="314" y="166" width="52" height="40" rx="10" fill="#DDD6FE" />
                    <rect x="322" y="230" width="36" height="12" rx="6" fill="#C4B5FD" />

                    <rect x="190" y="150" width="100" height="64" rx="10" fill="white" stroke="#CBD5E1" />
                    <polyline
                      points="198,180 210,176 222,184 234,170 246,186 258,176 270,182 282,174 290,178"
                      fill="none" stroke="url(#g1)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                    />

                    <rect x="108" y="96" width="120" height="32" rx="8" fill="white" stroke="#E5E7EB" />
                    <circle cx="118" cy="112" r="4" fill="#60A5FA" />
                    <rect x="126" y="106" width="92" height="12" rx="6" fill="#E5E7EB" />

                    <rect x="264" y="96" width="120" height="32" rx="8" fill="white" stroke="#E5E7EB" />
                    <circle cx="274" cy="112" r="4" fill="#A78BFA" />
                    <rect x="282" y="106" width="92" height="12" rx="6" fill="#E5E7EB" />
                  </svg>
                </div>
              </div>

              <div className="px-6 pb-6">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
                  onClick={onGenerateList}
                  disabled={loading}
                >
                  {loading ? "생성 중..." : "질문 리스트 생성"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
