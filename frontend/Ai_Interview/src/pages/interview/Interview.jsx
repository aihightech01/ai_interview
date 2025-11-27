// src/pages/interview/Interview.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { formatSec } from "../../utils/helper";
import Header from "../../components/Header";
import { useInterviewStore, STEPS } from "../../stores/interviewStore";

/* ===== 버튼 유틸 ===== */
const btn = (variant = "default") => {
  const base =
    "inline-flex h-10 items-center justify-center rounded-xl px-5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  return {
    primary: `${base} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600`,
    danger: `${base} bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600`,
    ghost: `${base} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-400`,
    outline: `${base} border-2 border-blue-600 text-blue-600 bg-white hover:bg-blue-50 focus:ring-blue-600`,
  }[variant] || `${base} bg-slate-800 text-white hover:bg-slate-900 focus:ring-slate-600`;
};

/* ===== 상수 ===== */
const MAX_SEC = 60; // 타이머 최대 60초

/* QuestionList → sessionStorage 포맷 매핑 (세션 복구용 보조 함수) */
function mapFromSessionStorage() {
  try {
    const raw = sessionStorage.getItem("selectedQuestions");
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return [];
    return arr
      .map((s) => ({
        questionId: s.questionId ?? s.questionNO ?? s.id ?? String(s?.id ?? ""),
        text: s.questionContent ?? s.text ?? s.content ?? "",
        source: (s.questionType ?? s.source ?? "COMMON").toUpperCase(),
      }))
      .filter((q) => q.questionId && q.text);
  } catch {
    return [];
  }
}

/* (선택) MediaRecorder 타입 호환 보조 */
function pickBestMime() {
  const cands = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  try {
    for (const t of cands) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
  } catch {}
  return "video/webm";
}

export default function Interview() {
  const nav = useNavigate();
  const { sessionId: routeId } = useParams();

  /* ===== 스토어: 세션→스토어 하이드레이트 & 단계 설정 ===== */
  const isHydrated = useInterviewStore((s) => s.isHydrated);
  const hydrateFromSession = useInterviewStore((s) => s.hydrateFromSession);
  const setStep = useInterviewStore((s) => s.setStep);

  useEffect(() => {
    hydrateFromSession();
    setStep(STEPS.INTERVIEW);
  }, [hydrateFromSession, setStep]);

  /* ===== 인터뷰 메타/선택 질문 ===== */
  const interviewNoStore = useInterviewStore((s) => s.interviewNo);
  const title = useInterviewStore((s) => s.title);
  const selectedStore = useInterviewStore((s) => s.selectedQuestions);
  const setSelectedStore = useInterviewStore((s) => s.setSelectedQuestions);

  // 컨텐츠 복구: 스토어 우선, 비어있으면 세션에서 보조 복구
  useEffect(() => {
    if (!selectedStore || selectedStore.length === 0) {
      const restored = mapFromSessionStorage();
      if (restored.length > 0) {
        setSelectedStore(
          restored.map((q) => ({ questionId: q.questionId, text: q.text, source: q.source }))
        );
      }
    }
  }, [selectedStore, setSelectedStore]);

  const questions = (selectedStore && selectedStore.length > 0)
    ? selectedStore
    : mapFromSessionStorage();

  const total = Array.isArray(questions) ? questions.length : 0;

  // 현재 인덱스는 간단히 로컬 상태로 관리(필요 시 스토어로 승격 가능)
  const [currentIdx, setIdx] = useState(0);
  useEffect(() => {
    if (total > 0 && currentIdx >= total) setIdx(total - 1);
  }, [total, currentIdx]);

  const q = total > 0 ? questions[Math.min(currentIdx, total - 1)] : null;

  // interviewNo는 스토어 우선, 없으면 세션/라우터 보조
  const interviewNoRaw =
    (interviewNoStore && String(interviewNoStore)) ||
    sessionStorage.getItem("interviewNo") ||
    routeId ||
    "";
  const interviewNoNum = Number.parseInt(String(interviewNoRaw).trim(), 10);

  /* ===== 녹화 상태 ===== */
  const [sec, setSec] = useState(0);
  const [rec, setRec] = useState(false);
  const [blob, setBlob] = useState(null);
  const [uploading, setUploading] = useState(false);

  const mediaRef = useRef(null);
  const recorderRef = useRef(null);
  const skipSaveRef = useRef(false);

  /* ===== 가드 ===== */
  // 선택 질문 없으면 질문 선택 화면으로
  useEffect(() => {
    if (!isHydrated) return;
    if (total === 0) {
      alert("선택된 질문이 없습니다. 질문을 먼저 선택해 주세요.");
      nav("/interview/questions");
    }
  }, [isHydrated, total, nav]);

  // 인터뷰 번호 가드
  useEffect(() => {
    if (!isHydrated) return;
    if (!Number.isFinite(interviewNoNum)) {
      alert("면접 세션 번호(interviewNo)가 유효하지 않습니다. 처음부터 다시 진행해 주세요.");
      nav("/interview/select");
    }
  }, [isHydrated, interviewNoNum, nav]);

  /* ===== 타이머 ===== */
  useEffect(() => {
    if (!rec) return;
    const id = setInterval(() => {
      setSec((s) => {
        if (s + 1 >= MAX_SEC) {
          stopRec();
          return MAX_SEC;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec]);

  /* ===== 녹화 컨트롤 ===== */
  async function startRec() {
    if (rec || total === 0) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (mediaRef.current) {
      mediaRef.current.srcObject = stream;
      try {
        await mediaRef.current.play();
      } catch {
        /* ignore */
      }
    }
    const chunks = [];
    const mime = pickBestMime();
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      if (!skipSaveRef.current) {
        setBlob(new Blob(chunks, { type: mime }));
      }
      skipSaveRef.current = false;
    };
    recorderRef.current = recorder;
    recorder.start();
    setSec(0);
    setRec(true);
  }

  function stopRec() {
    try {
      recorderRef.current?.stop();
    } catch {}
    try {
      mediaRef.current?.srcObject?.getTracks?.().forEach((t) => t.stop());
    } catch {}
    setRec(false);
  }

  // 재촬영
  function resetTake() {
    if (recorderRef.current && rec) {
      skipSaveRef.current = true;
      try { recorderRef.current.stop(); } catch {}
    }
    const stream = mediaRef.current?.srcObject;
    stream?.getTracks?.().forEach((t) => t.stop());
    if (mediaRef.current) {
      mediaRef.current.pause?.();
      mediaRef.current.srcObject = null;
      mediaRef.current.removeAttribute?.("src");
      mediaRef.current.load?.();
    }
    setRec(false);
    setBlob(null);
    setSec(0);
  }

  /* ===== 업로드 → 다음 문항(Optimistic) ===== */
  async function uploadAndNext() {
    if (!blob || !q) return;

    if (!Number.isFinite(interviewNoNum)) {
      alert("면접 세션 번호(interviewNo)가 유효하지 않습니다. 처음부터 다시 진행해 주세요.");
      nav("/interview/select");
      return;
    }
    const questionNoNum = Number.parseInt(String(q.questionId).trim(), 10);
    if (!Number.isFinite(questionNoNum)) {
      alert("질문 번호가 유효하지 않습니다.");
      return;
    }

    const url = `/interviews/${encodeURIComponent(interviewNoNum)}/${encodeURIComponent(
      questionNoNum
    )}/video`;
    const fd = new FormData();
    fd.append("video", blob, "answer.webm");

    try {
      setUploading(true);
      // 응답 대기 없이 업로드 시작 (실패해도 화면 전환은 진행)
      axiosInstance.post(url, fd, { timeout: 0 }).catch(() => {});
    } catch {
      alert("영상 업로드에 실패했습니다. 네트워크를 확인하고 다시 시도해 주세요.");
    } finally {
      setUploading(false);
    }

    // 다음 문항 또는 마이페이지로
    const next = currentIdx + 1;
    if (next < total) {
      setBlob(null);
      setSec(0);
      setIdx(next);
    } else {
      try {
        const key = "aiInterview.processing";
        const payload = { interviewNo: interviewNoNum, status: "processing", startedAt: Date.now() };
        localStorage.setItem(key, JSON.stringify(payload));
      } catch {}
      nav("/mypage", { state: { analyzing: true, interviewNo: interviewNoNum }, replace: true });
    }
  }

  /* ===== UI ===== */
  return (
    <div className="min-h-screen w-full bg-[#F7FAFC] flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-[1100px] mx-auto px-4 py-6">
          {/* 상단 상태바 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-blue-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="2" />
                  <path d="M12 7v5l3 3" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="text-sm font-semibold tabular-nums">{formatSec(sec)}</span>
              </div>
              <div className="text-sm text-slate-600">
                {Math.min(currentIdx + 1, Math.max(total, 1))}/{Math.max(total, 1)}
              </div>
              <button
                className="ml-2 inline-flex h-8 items-center justify-center rounded-lg border border-blue-600 bg-white px-3 text-xs font-medium text-blue-600 hover:bg-blue-50"
                onClick={() => nav("/")}
              >
                연습 종료
              </button>
            </div>
            <div className="text-sm text-slate-500 truncate max-w-[50%]">
              {title ? <>제목: <b className="text-slate-700">{title}</b></> : null}
            </div>
          </div>

          {/* 질문 카드 */}
          {q ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-4 mb-4">
              <div className="inline-block rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 mb-2">
                Q{currentIdx + 1}.
              </div>
              <div className="text-[15px] font-medium text-slate-800 whitespace-pre-line break-words">
                {q.text}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-amber-300 p-4 mb-4">
              <div className="text-sm text-amber-700">선택된 질문이 없어 면접을 시작할 수 없습니다.</div>
              <div className="mt-3">
                <button className={btn("outline")} onClick={() => nav("/interview/questions")}>
                  질문 선택하러 가기
                </button>
              </div>
            </div>
          )}

          {/* 비디오 프레임 */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4">
            <div className="relative w-full aspect-video rounded-xl bg-slate-100 overflow-hidden">
              <video ref={mediaRef} className="w-full h-full object-cover" muted playsInline />
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

            {/* 컨트롤 버튼 */}
            <div className="mt-6 flex items-center justify-center gap-4">
              {!rec ? (
                <button className={btn("primary")} onClick={startRec} disabled={uploading || !q}>
                  시작
                </button>
              ) : (
                <button className={btn("danger")} onClick={stopRec}>
                  녹화 종료
                </button>
              )}

              <button className={btn("ghost")} onClick={resetTake} disabled={uploading || !q}>
                재촬영
              </button>

              <button
                className={btn("outline")}
                onClick={uploadAndNext}
                disabled={!blob || uploading || !q}
                title={!q ? "질문을 먼저 선택하세요" : !blob ? "녹화 후 업로드하세요" : undefined}
              >
                {uploading ? "업로드 중..." : "다음"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
