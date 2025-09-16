// src/pages/interview/Interview.jsx
import React, { useEffect, useRef, useState } from "react";
import { useInterview } from "../../context/InterviewContext";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { formatSec } from "../../utils/helper";

// 버튼 유틸 (템플릿 리터럴 오타 수정)
const btn = (variant = "default") => {
  const base =
    "inline-flex h-10 items-center justify-center rounded-xl px-5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  return (
    {
      primary: `${base} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600`,
      danger: `${base} bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600`,
      ghost: `${base} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-400`,
      outline: `${base} border-2 border-blue-600 text-blue-600 bg-white hover:bg-blue-50 focus:ring-blue-600`,
    }[variant] || `${base} bg-slate-800 text-white hover:bg-slate-900 focus:ring-slate-600`
  );
};

const MAX_SEC = 60;      // 타이머 최대 60초
const FORCE_MOCK = false; // 실제 업로드 사용 시 false 로 변경
const DEV_SESSION_ID = "123" // 임의 세션ID (원할 때 값만 바꿔 써요)

export default function Interview() {
  const { selected, session, currentIdx, setIdx } = useInterview();
  const { sessionId: routeId } = useParams();
  const nav = useNavigate();

  // 기본 3문항 폴백
  const questions =
    Array.isArray(selected) && selected.length > 0
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
    setBlob(null); // ✅ 새 녹화 시작 시 이전 blob 무효화 → '다음' 비활성 유지
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
        setBlob(new Blob(chunks, { type: "video/webm" })); // 녹화 종료 후에만 blob 생성 → '다음' 활성화
      }
      skipSaveRef.current = false; // 다음 녹화를 위해 초기화
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
      mediaRef.current?.srcObject?.getTracks().forEach((t) => t.stop());
    } catch {}
    setRec(false);
  }

  // 🔧 업로드 + 다음 이동 (멀티파트)
  async function uploadAndNext() {
    if (!blob) return;

    if (!FORCE_MOCK && (API_PATHS?.VIDEO?.UPLOAD || true)) {
      try {
        // 멀티파트 폼 구성
        const file = new File([blob], "video.webm", { type: "video/webm" });
        const form = new FormData();
        form.append("interviewNo", String(sid));          // 예: 123
        form.append("questionNo", String(q?.questionId)); // 예: 456
        form.append("file", file);

        // 엔드포인트: /api/video/upload (api 인스턴스 baseURL=/api 가정)
        const url = API_PATHS?.VIDEO?.UPLOAD || "/video/upload";
        const res = await api.post(url, form, {
          headers: { "Content-Type": "multipart/form-data" }, // boundary 자동 세팅
        });

        // 성공 응답 예: { message: true }
        if (res?.data?.message !== true) {
          console.warn("Unexpected upload response:", res?.data);
        }
      } catch (e) {
        console.error("Upload failed:", e);
        // 실패 시 진행을 멈추고 싶으면 return; 처리
        // return;
      }
    } else {
      // 모의 업로드
      await new Promise((r) => setTimeout(r, 250));
      console.log("[mock] POST /api/video/upload", {
        interviewNo: sid,
        questionNo: q?.questionId,
        file: `video.webm (${blob.size} bytes)`,
      });
    }

    // ✅ 기존 '다음' 동작 그대로
    const next = (currentIdx ?? 0) + 1;
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
    // onstop에서 blob 저장하지 않도록 플래그 세팅
    if (recorderRef.current && rec) {
      skipSaveRef.current = true;
      try {
        recorderRef.current.stop();
      } catch {}
    }

    // 스트림 트랙 정지
    const stream = mediaRef.current?.srcObject;
    if (stream && typeof stream.getTracks === "function") {
      stream.getTracks().forEach((t) => t.stop());
    }

    // 비디오 요소 초기화
    if (mediaRef.current) {
      mediaRef.current.pause?.();
      mediaRef.current.srcObject = null;
      mediaRef.current.removeAttribute?.("src");
      mediaRef.current.load?.();
    }

    // 상태 초기화 → 시작 버튼 보이는 상태
    setRec(false);
    setBlob(null);
    setSec(0);
  }

  return (
    <div className="min-h-screen w-full bg-[#F7FAFC] flex flex-col">
      <main className="flex-1">
        <div className="max-w-[1100px] mx-auto px-4 py-6">
          {/* Top status row */}
          <div className="flex items-center justify-between mb-3">
            {/* 타이머 + 진행도 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-blue-600">
                {/* 시계 아이콘 */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="2" />
                  <path d="M12 7v5l3 3" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="text-sm font-semibold tabular-nums">{formatSec(sec)}</span>
              </div>
              <div className="text-sm text-slate-600">{(currentIdx ?? 0) + 1}/{total}</div>
              {/* 연습 종료 */}
              <button
                className="ml-2 inline-flex h-8 items-center justify-center rounded-lg border border-blue-600 bg-white px-3 text-xs font-medium text-blue-600 hover:bg-blue-50"
                onClick={() => nav("/")}
              >
                연습 종료
              </button>
            </div>

            {/* 우측 비워둠 */}
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

            {/* 하단 컨트롤 버튼 */}
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
                disabled={rec || !blob} // ✅ 녹화 중이거나 영상이 없으면 비활성화
              >
                다음
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full border-t">
        <div className="max-w-[1100px] mx-auto px-4 py-8 text-xs text-gray-500 flex items-center justify-between">
          <span>© 2025 AI 면접 코치. All rights reserved.</span>
          <span>문의: support@example.com</span>
        </div>
      </footer>
    </div>
  );
}
