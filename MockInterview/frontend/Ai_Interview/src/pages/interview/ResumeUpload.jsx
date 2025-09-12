// src/pages/resume/ResumeUploadPage.jsx
import React, { useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useNavigate } from "react-router-dom";
import AppHeader from "../../components/Header"; // ✅ 공용 헤더 사용

function Footer() {
  return (
    <footer className="w-full border-t">
      <div className="max-w-[1200px] mx-auto px-4 py-8 text-xs text-gray-500 flex items-center justify-between">
        <span>© 2025 AI 면접 코치. All rights reserved.</span>
        <span>문의: support@example.com</span>
      </div>
    </footer>
  );
}

export default function ResumeUploadPage() {
  const nav = useNavigate();
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onUploadText() {
    if (!text) return;
    setLoading(true);
    try {
      // ✅ API_PATHS 로 통일
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

  async function onUploadFile() {
    if (!file) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      // ✅ API_PATHS 로 통일
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
    nav("/interview/questions");
  }

  return (
    <div className="min-h-screen w-full bg-[#F7FAFC] flex flex-col">
      {/* ✅ 공용 헤더 */}
      <AppHeader />

      {/* 메인 컨텐츠 */}
      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-4 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 좌측: 자소서 업로드 패널 */}
            <section className="bg-white rounded-xl border shadow-sm">
              <div className="p-6">
                <h1 className="text-lg font-semibold">자소서 업로드</h1>

                {/* 파일 업로드 카드 */}
                <div className="mt-4 border rounded-xl p-5">
                  <p className="text-xs text-gray-500 mb-3">
                    자소서 파일을 끌어다 놓으세요
                    <br />
                    PDF/DOCX/텍스트 파일 · 최대 <b>10MB</b>
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm"
                    />
                    <button
                      className="px-4 py-2 rounded bg-[#3B82F6] text-white text-sm disabled:opacity-50"
                      disabled={!file || loading}
                      onClick={onUploadFile}
                    >
                      {loading ? "업로드 중..." : "업로드"}
                    </button>
                  </div>
                </div>

                {/* 텍스트 붙여넣기 카드 */}
                <div className="mt-4 border rounded-xl p-5">
                  <p className="text-xs text-gray-500 mb-2">또는 텍스트 붙여넣기</p>
                  <textarea
                    className="w-full h-40 border rounded p-3 text-sm"
                    placeholder="자소서 텍스트 붙여넣기"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* 우측: 이미지 영역 + 버튼 */}
            <section className="bg-white rounded-xl border shadow-sm flex flex-col">
              <div className="p-6">
                <h2 className="text-sm font-semibold mb-2">이미지 영역</h2>
                <div className="w-full h-[420px] border rounded-lg flex items-center justify-center text-gray-400 text-sm">
                  이미지 영역
                </div>
              </div>
              <div className="px-6 pb-6">
                <button
                  className="px-4 py-2 rounded bg-[#3B82F6] text-white text-sm disabled:opacity-50"
                  onClick={onGenerateList}
                  disabled={loading}
                >
                  {loading ? "생성 중..." : "질문 리스트 생성"}
                </button>
              </div>
            </section>
          </div>

          {/* 좌측 아래 텍스트 업로드 버튼 */}
          <div className="mt-4 max-w-[600px]">
            <button
              className="px-4 py-2 rounded border border-[#3B82F6] text-[#3B82F6] text-sm disabled:opacity-50"
              disabled={!text || loading}
              onClick={onUploadText}
            >
              {loading ? "업로드 중..." : "텍스트 업로드"}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
