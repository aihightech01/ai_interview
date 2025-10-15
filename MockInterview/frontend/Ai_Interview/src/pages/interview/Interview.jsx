// src/pages/interview/Interview.jsx
import React, { useEffect, useRef, useState } from "react";
import { useInterview } from "../../context/InterviewContext";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { formatSec } from "../../utils/helper";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

// 버튼 유틸
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

const MAX_SEC = 60; // 타이머 최대 60초

// QuestionList → sessionStorage 포맷 매핑
function mapFromSessionStorage() {
  try {
    const raw = sessionStorage.getItem("selectedQuestions");
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return [];
    return arr
      .map((s) => ({
        questionId: s.questionId ?? s.questionNO ?? s.id ?? String(s?.id ?? ""),
        text: s.questionContent ?? s.text ?? s.content ?? "",
        source: s.questionType ?? s.source ?? "COMMON",
      }))
      .filter((q) => q.questionId && q.text);
  } catch {
    return [];
  }
}

export default function Interview() {
  // 컨텍스트 + 복구
  const { selected, currentIdx, setIdx, setSelected } = useInterview?.() ?? {};
  const nav = useNavigate();
  const { sessionId: routeId } = useParams();

  useEffect(() => {
    if (!selected || selected.length === 0) {
      const restored = mapFromSessionStorage();
      if (restored.length > 0 && typeof setSelected === "function") {
        setSelected(restored);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hydrated = (selected && selected.length > 0) ? selected : mapFromSessionStorage();
  const questions = Array.isArray(hydrated) ? hydrated : [];
  const total = questions.length;
  const q = total > 0 ? questions[Math.min(currentIdx ?? 0, total - 1)] : null;

  const interviewNoRaw = sessionStorage.getItem("interviewNo") || routeId || "";
  const interviewNoNum = Number.parseInt(String(interviewNoRaw).trim(), 10);

  const [sec, setSec] = useState(0);
  const [rec, setRec] = useState(false);
  const [blob, setBlob] = useState(null);
  const [uploading, setUploading] = useState(false);

  const mediaRef = useRef(null);
  const recorderRef = useRef(null);
  const skipSaveRef = useRef(false);

  // 선택 0개 가드
  useEffect(() => {
    if (total === 0) {
      alert("선택된 질문이 없습니다. 질문을 먼저 선택해 주세요.");
      nav("/interview/questions");
    }
  }, [total, nav]);

  // 타이머
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
  }, [rec]);

  async function startRec() {
    if (rec || total === 0) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (mediaRef.current) {
      mediaRef.current.srcObject = stream;
      try { await mediaRef.current.play(); } catch { }
    }
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      if (!skipSaveRef.current) {
        setBlob(new Blob(chunks, { type: "video/webm" }));
      }
      skipSaveRef.current = false;
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

  // 업로드 → 즉시 이동(Optimistic), 마지막도 fire-and-forget
  async function uploadAndNext() {
    if (!blob || !q) { L("warn", "Interview", "uploadAndNext blocked: no blob or no question"); return; }

    L("info", "Interview", "uploadAndNext", {
      interviewNoNum, questionId: q.questionId, currentIdx, total, blobSize: blob?.size
    });

    if (!Number.isFinite(interviewNoNum)) {
      alert("면접 세션 번호(interviewNo)가 유효하지 않습니다. 처음부터 다시 진행해 주세요.");
      L("error", "Interview", "invalid interviewNoNum", interviewNoNum);
      nav("/interview/select");
      return;
    }
    const questionNoNum = Number.parseInt(String(q.questionId).trim(), 10);
    if (!Number.isFinite(questionNoNum)) {
      alert("질문 번호가 유효하지 않습니다.");
      L("error", "Interview", "invalid questionNoNum", q.questionId);
      return;
    }


    const url = `/interviews/${encodeURIComponent(interviewNoNum)}/${encodeURIComponent(questionNoNum)}/video`;
    const isLast = (currentIdx ?? 0) === total - 1;

    // 공통 FormData
    const fd = new FormData();
    fd.append("video", blob, "answer.webm");

    try {
      setUploading(true);
      L("info", "Interview", "POST begin", { url, isLast });

      // ✅ 모든 문항: 응답을 기다리지 않고 백그라운드 업로드
      axiosInstance.post(url, fd, { timeout: 0 })
        .then((res) => {
          L("info", "Interview", "POST success (non-blocking)", { status: res?.status, data: res?.data });
        })
        .catch((e) => {
          L("warn", "Interview", "POST error (non-blocking)", {
            status: e?.response?.status, data: e?.response?.data, message: e?.message
          });
        });
    } catch (e) {
      L("error", "Interview", "POST exception", e);
      alert("영상 업로드에 실패했습니다. 네트워크를 확인하고 다시 시도해 주세요.");
    } finally {
      setUploading(false);
      L("info", "Interview", "POST finally");
    }


    // 다음 문항 또는 마이페이지로
    const next = (currentIdx ?? 0) + 1;
    if (next < total) {
      setBlob(null);
      setSec(0);
      typeof setIdx === "function" ? setIdx(next) : null;
    } else {
      // ✅ 마지막: 즉시 마이페이지로 이동 + '분석중' 플래그 전달
      try {
        const key = "aiInterview.processing";
        const payload = {
          interviewNo: interviewNoNum,
          status: "processing",
          startedAt: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(payload));
      } catch { }

      nav("/mypage", {
        state: { analyzing: true, interviewNo: interviewNoNum },
        replace: true,
      });
    }
  }


  // 재촬영
  function resetTake() {
    if (recorderRef.current && rec) {
      skipSaveRef.current = true;
      recorderRef.current.stop();
    }
    const stream = mediaRef.current?.srcObject;
    if (stream && typeof stream.getTracks === "function") {
      stream.getTracks().forEach((t) => t.stop());
    }
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

  return (
    <div className="min-h-screen w-full bg-[#F7FAFC] flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-[1100px] mx-auto px-4 py-6">
          {/* Top status row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-blue-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="2" />
                  <path d="M12 7v5l3 3" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="text-sm font-semibold tabular-nums">{formatSec(sec)}</span>
              </div>
              <div className="text-sm text-slate-600">
                {Math.min((currentIdx ?? 0) + 1, Math.max(total, 1))}/{Math.max(total, 1)}
              </div>
              <button
                className="ml-2 inline-flex h-8 items-center justify-center rounded-lg border border-blue-600 bg-white px-3 text-xs font-medium text-blue-600 hover:bg-blue-50"
                onClick={() => nav("/")}
              >
                연습 종료
              </button>
            </div>
            <div />
          </div>

          {/* 질문 카드 */}
          {q ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-4 mb-4">
              <div className="inline-block rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 mb-2">
                Q{(currentIdx ?? 0) + 1}.
              </div>
              <div className="text-[15px] font-medium text-slate-800">
                {q.text}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-amber-300 p-4 mb-4">
              <div className="text-sm text-amber-700">
                선택된 질문이 없어 면접을 시작할 수 없습니다.
              </div>
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
              <video
                ref={mediaRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
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
                title={!q ? "질문을 먼저 선택하세요" : (!blob ? "녹화 후 업로드하세요" : undefined)}
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
