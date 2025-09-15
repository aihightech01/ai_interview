// src/pages/interview/Interview.jsx
import React, { useEffect, useRef, useState } from "react";
import { useInterview } from "../../context/InterviewContext";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { formatSec } from "../../utils/helper";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

// 버튼 유틸(시안과 유사한 톤)
const btn = (variant = "default") => {
  const base =
    "inline-flex h-10 items-center justify-center rounded-xl px-5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  return {
    primary: `${base} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600`,
    danger:  `${base} bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600`,
    ghost:   `${base} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-400`,
    outline: `${base} border-2 border-blue-600 text-blue-600 bg-white hover:bg-blue-50 focus:ring-blue-600`
  }[variant] || `${base} bg-slate-800 text-white hover:bg-slate-900 focus:ring-slate-600`;
};

const MAX_SEC = 60;            // 타이머 최대 60초
const FORCE_MOCK = true;       // 백엔드 미연결: 모의 업로드로 진행

export default function Interview() {
  const { selected, session, currentIdx, setIdx } = useInterview();
  const { sessionId: routeId } = useParams();
  const nav = useNavigate();

  // 기본 3문항
  const questions = Array.isArray(selected) && selected.length > 0
    ? selected
    : [
        { questionId: 1, text: "최근 해결했던 어려운 문제와 해결 과정을 설명해 주세요." },
        { questionId: 2, text: "팀 프로젝트에서 맡았던 역할과 성과를 구체적으로 말해 주세요." },
        { questionId: 3, text: "실패 경험 하나와, 그 경험에서 배운 점을 알려 주세요." },
      ];
  const total = questions.length;
  const q = questions[Math.min(currentIdx ?? 0, total - 1)];
  const sid = session?.sessionId || routeId || "mock-session";

  const [sec, setSec] = useState(0);
  const [rec, setRec] = useState(false);
  const [blob, setBlob] = useState(null);

  const mediaRef = useRef(null);
  const recorderRef = useRef(null);
  const skipSaveRef = useRef(false);

  // 타이머 (최대 60초)
  useEffect(() => {
    if (!rec) return;
    const id = setInterval(() => {
      setSec((s) => {
        if (s + 1 >= MAX_SEC) {
          // 60초 도달 시 자동 정지
          stopRec();
          return MAX_SEC;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [rec]);

  async function startRec() {
    if (rec) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (mediaRef.current) {
      mediaRef.current.srcObject = stream;
      await mediaRef.current.play();
    }
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      if (!skipSaveRef.current) {
        setBlob(new Blob(chunks, { type: "video/webm" }));
      }
      skipSaveRef.current = false; // 다음 녹화를 위해 초기화
    };
    recorderRef.current = recorder;
    recorder.start();
    setSec(0);
    setRec(true);
  }

  function stopRec() {
    recorderRef.current?.stop();
    mediaRef.current?.srcObject?.getTracks().forEach((t) => t.stop());
    setRec(false);
  }

  async function uploadAndNext() {
    if (!blob) return;

    const canUseBackend = !FORCE_MOCK && q?.questionId && sid && API_PATHS?.MEDIA;
    if (canUseBackend) {
      // 실제 업로드 플로우
      const { data: ticket } = await api.post(API_PATHS.MEDIA.TICKET, {
        sessionId: sid, questionId: q.questionId, contentType: "video/webm",
      });
      await fetch(ticket.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "video/webm" },
        body: blob,
      });
      await api.post(API_PATHS.MEDIA.CONFIRM, {
        mediaId: ticket.mediaId, sessionId: sid, questionId: q.questionId, durationSec: sec,
      });
    } else {
      // 모의 업로드
      await new Promise((r) => setTimeout(r, 250));
    }

    const next = (currentIdx ?? 0) + 1;

    // ❗요청사항: '다음'을 누르면 분석 페이지로 가지 말고 다음 질문으로 이동
    if (next < total) {
      setBlob(null);
      setSec(0);
      setIdx(next);
    } else {
      // 마지막 문항 이후에만 분석(로딩) 페이지로
      nav("/mypage");
    }
  }

  // 재촬영: 현재 문항에서 녹화물/타이머만 초기화
  function resetTake() {
    // ✅ onstop에서 blob 저장하지 않도록 플래그 세팅
    if (recorderRef.current && rec) {
      skipSaveRef.current = true;
      recorderRef.current.stop();
    }

    // ✅ 스트림 트랙 정지
    const stream = mediaRef.current?.srcObject;
    if (stream && typeof stream.getTracks === "function") {
      stream.getTracks().forEach((t) => t.stop());
    }

    // ✅ 비디오 요소 초기화 (처음 상태로)
    if (mediaRef.current) {
      mediaRef.current.pause?.();
      mediaRef.current.srcObject = null;
      mediaRef.current.removeAttribute?.("src"); // 안전하게 초기화
      mediaRef.current.load?.();
    }

    // ✅ 상태 초기화 → 시작 버튼 보이는 상태
    setRec(false);
    setBlob(null);
    setSec(0);
  }


  return (
    <div className="min-h-screen w-full bg-[#F7FAFC] flex flex-col">
      <Header />
      {/* 상단 헤더 영역은 AppHeader가 있다면 그걸 사용하세요. 이 화면 내부 상단 바만 구성 */}
      <main className="flex-1">
        <div className="max-w-[1100px] mx-auto px-4 py-6">
          {/* Top status row */}
          <div className="flex items-center justify-between mb-3">
            {/* 타이머 + 진행도 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-blue-600">
                {/* 시계 아이콘 간단한 svg */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="2"/>
                  <path d="M12 7v5l3 3" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="text-sm font-semibold tabular-nums">{formatSec(sec)}</span>
              </div>
              <div className="text-sm text-slate-600">
                {(currentIdx ?? 0) + 1}/{total}
              </div>
              {/* 연습 종료(링크 버튼) */}
              <button
                className="ml-2 inline-flex h-8 items-center justify-center rounded-lg border border-blue-600 bg-white px-3 text-xs font-medium text-blue-600 hover:bg-blue-50"
                onClick={() => nav("/")}
              >
                연습 종료
              </button>
            </div>

            {/* 우측 비워둠(필요 시 다른 컨트롤 추가) */}
            <div />
          </div>

          {/* 질문 카드 */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 mb-4">
            <div className="inline-block rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 mb-2">
              Q{(currentIdx ?? 0) + 1}.
            </div>
            <div className="text-[15px] font-medium text-slate-800">
              {q.text}
            </div>
          </div>

          {/* 비디오 프레임 */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4">
            <div className="relative w-full aspect-video rounded-xl bg-slate-100 overflow-hidden">
              <video
                ref={mediaRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              {/* REC 인디케이터 */}
              {rec && (
                <div className="absolute inset-0 flex items-start justify-center pt-6">
                  <div className="flex items-center gap-2 text-rose-600 text-sm font-semibold">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                    REC
                  </div>
                </div>
              )}
              {!rec && !blob && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm select-none">
                  Webcam
                </div>
              )}
            </div>

            {/* 하단 컨트롤 버튼 영역 */}
            <div className="mt-6 flex items-center justify-center gap-4">
              {!rec ? (
                <button className={btn("primary")} onClick={startRec}>시작</button>
              ) : (
                <button className={btn("danger")} onClick={stopRec}>녹화 종료</button>
              )}

              <button className={btn("ghost")} onClick={resetTake}>재촬영</button>

              <button
                className={btn("outline")}
                onClick={uploadAndNext}
                disabled={!blob}
              >
                다음
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
