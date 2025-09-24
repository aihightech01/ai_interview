// src/pages/resume/ResumeUploadPage.jsx
import React, { useState, useEffect } from "react";
import axios from "axios"; // 👈 업로드 전용 인스턴스용
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function ResumeUploadPage() {
  const nav = useNavigate();

  // ===== 업로드 전용 axios (mock 미장착) =====
  const uploadAxios = axios.create({
    baseURL: "/api",              // 프록시 사용 시 /api, 직접 호출이면 "http://localhost:8080"
    withCredentials: false,
  });

  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);

  const [text, setText] = useState("");
  const [file, setFile] = useState(null); // 선택 파일을 화면 표시용으로만 유지
  const [loading, setLoading] = useState(false);

  const [interviewNo, setInterviewNo] = useState("");

  useEffect(() => {
    const no = sessionStorage.getItem("interviewNo") || "";
    if (!no) {
      alert("면접 세션이 없습니다. 면접 선택 페이지에서 다시 시작해 주세요.");
      nav("/interview/select");
      return;
    }
    setInterviewNo(no);
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
   * 공통 업로드 함수
   * - mode: "file" | "text"
   * - fileArg: File 객체 (파일 업로드 시 필수)
   * - textArg: string (텍스트 업로드 시 필수)
   * - extraFile: 텍스트 업로드 시 파일도 함께 보낼 경우 (선택)
   */
  async function submitFormData({ mode, fileArg, textArg, extraFile }) {
    if (!interviewNo) {
      alert("면접 세션이 없습니다. 면접 선택 페이지에서 다시 시작해 주세요.");
      nav("/interview/select");
      return;
    }
    if (!ensureTitleOrFocus()) return;

    const fd = new FormData();
    fd.append("interviewTitle", title.trim());

    if (mode === "file") {
      if (!(fileArg instanceof File)) {
        alert("업로드할 파일이 없습니다.");
        return;
      }
      fd.append("resumeFile", fileArg);
      fd.append("textContent", ""); // 백엔드 파라미터 일치 보장
    } else if (mode === "text") {
      const t = (textArg ?? "").trim();
      if (!t) {
        alert("텍스트가 비어 있습니다.");
        return;
      }
      fd.append("textContent", t);
      if (extraFile instanceof File) {
        fd.append("resumeFile", extraFile);
      }
    } else {
      console.error("submitFormData: unknown mode", mode);
      return;
    }

    logFormData(fd);

    const url = `/resumes/upload/${encodeURIComponent(interviewNo)}`;
    const token =
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      "";

    try {
      setLoading(true);

      const { data } = await uploadAxios.post(url, fd, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
          // Content-Type 지정 금지: 브라우저가 boundary 자동 부여
        },
      });

      if (!data || data.message !== true) {
        console.error("[ResumeUpload] unexpected response:", data);
        throw new Error("업로드 응답이 올바르지 않습니다.");
      }
      nav("/interview/questions");
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

  // 파일 선택 시: 로컬 변수 f를 즉시 업로드에 사용 (state 반영 기다리지 않음)
  async function onFileChange(e) {
    const f = e.target.files?.[0] || null;
    setFile(f); // 화면 표시용
    if (!f) return;
    try {
      await submitFormData({ mode: "file", fileArg: f });
    } finally {
      // 같은 파일 재선택 가능
      e.target.value = "";
    }
  }

  // 텍스트만 업로드 (필요하면 화면에 표시된 파일도 함께 보낼 수 있음)
  async function onUploadText() {
    await submitFormData({ mode: "text", textArg: text, extraFile: file ?? undefined });
  }

  function onGenerateList() {
    if (!ensureTitleOrFocus()) return;
    nav("/interview/questions");
  }

  return (
    <div className="min-h-screen w-full bg-[#F7FAFC] flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-4 py-10">
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
            <div className="p-6">
              <h1 className="text-lg font-semibold mb-2">인터뷰 제목</h1>
              <input type="hidden" name="interviewNo" value={interviewNo} />
              <input
                type="text"
                className={`w-full max-w-[560px] h-10 px-3 rounded-lg border text-sm outline-none transition
                ${
                  titleTouched && titleEmpty
                    ? "border-red-500 ring-1 ring-red-200"
                    : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                }`}
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
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-6">
                <h1 className="text-lg font-semibold">자소서 업로드</h1>

                <div className="mt-4 rounded-xl border border-slate-200 p-5">
                  <p className="text-xs text-gray-500 mb-4">
                    파일을 선택하면 즉시 업로드됩니다.
                    <br />
                    PDF/DOCX/텍스트 파일 · 최대 <b>10MB</b>
                  </p>
                  <input
                    type="file"
                    name="resumeFile"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={onFileChange}
                    disabled={loading}
                    className="block w-full text-sm text-slate-700
                               file:mr-4 file:py-2 file:px-4
                               file:rounded-lg file:border-0
                               file:text-sm file:font-medium
                               file:bg-blue-600 file:text-white
                               hover:file:bg-blue-700
                               disabled:opacity-50"
                  />
                  {file && (
                    <p className="mt-2 text-sm text-slate-500">
                      선택된 파일: <span className="font-medium">{file.name}</span>
                    </p>
                  )}
                </div>

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
                      type="button"
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-600 px-4 text-sm font-medium text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
                      disabled={!text.trim() || loading}
                      onClick={onUploadText}
                    >
                      {loading ? "업로드 중..." : "텍스트 업로드"}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="p-6">
                <div className="w-full h-[420px] border border-slate-200 rounded-lg flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
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
