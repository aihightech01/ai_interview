// src/pages/interview/Calibration.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const NEXT_BASE = "/interview/run";
const CALIB_OVERLAY_DELAY_MS = 3000;
const RECORD_DURATION_MS = 3000;
const API_BASE = (import.meta.env.VITE_API_BASE || "http://172.31.57.139:8080").replace(/\/+$/, "");

function isTypeSupported(type) {
  try {
    return typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type);
  } catch {
    return false;
  }
}
const FALLBACK_WEBM_VP9 = "video/webm; codecs=vp9";
const FALLBACK_WEBM_VP8 = "video/webm; codecs=vp8";
const FALLBACK_WEBM = "video/webm";

const GUIDE = [
  "얼굴을 중앙에 맞추고 눈높이를 수평으로 맞추세요.",
  "답변할 때는 화면이 아닌 카메라 렌즈를 바라보세요.",
  "주변 소음을 줄이고 마이크를 너무 멀리 두지 마세요.",
  "정면의 부드러운 조명, 역광·복잡한 배경은 피하세요.",
  "시작하기 버튼 클릭 후 3초 지난후 면접 버튼 활성화",
];

const mimeToExt = (mime = "video/webm") => {
  const m = (mime || "").toLowerCase();
  if (m.includes("webm")) return "webm";
  if (m.includes("mp4")) return "mp4";
  return "webm";
};
const joinUrl = (base, path) =>
  `${base.replace(/\/+$/, "")}/${String(path || "").replace(/^\/+/, "")}`;

async function uploadCalibration(interviewNo, blob, mimeType = "video/webm") {
  if (!interviewNo) throw new Error("interviewNo가 없습니다.");
  const ext = mimeToExt(mimeType);
  const filename = `calibration_${Date.now()}.${ext}`;
  const form = new FormData();
  form.append("video", blob, filename);
  const url = joinUrl(API_BASE, `/api/interviews/${interviewNo}/calibration`);
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`업로드 실패 (HTTP ${res.status}) ${text}`);
  }
  const data = await res.json().catch(() => ({}));
  if (data?.message !== true) throw new Error(data?.error || "서버에서 실패 응답을 반환했습니다.");
  return data;
}

export default function Calibration() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const interviewNo = state?.interviewNo ?? null;

  const [calibStarted, setCalibStarted] = useState(false);
  const [calibCooling, setCalibCooling] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const mediaRecorderRef = useRef(null);
  const recordedTypeRef = useRef("");

  const getMediaPermission = useCallback(async () => {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    setStream(s);
    if (videoRef.current) videoRef.current.srcObject = s;
    return s;
  }, []);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  useEffect(() => {
    if (!stream) return;
    const v = videoRef.current;
    if (!v) return;
    if (v.srcObject !== stream) v.srcObject = stream;
    v.muted = true;
    v.play?.().catch(() => {});
  }, [stream]);

  const onCalibrationStart = async () => {
    try {
      setCalibStarted(true);
      setShowOverlay(false);
      if (!stream) await getMediaPermission();

      setCalibCooling(true);
      setCooldownLeft(Math.floor(CALIB_OVERLAY_DELAY_MS / 1000));
      const timer = setInterval(() => {
        setCooldownLeft((s) => {
          if (s <= 1) {
            clearInterval(timer);
            setCalibCooling(false);
            setShowOverlay(true);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } catch (e) {
      console.error(e);
      alert(`캘리브레이션 오류: ${e.message ?? ""}`);
      setCalibStarted(false);
      setCalibCooling(false);
      setCooldownLeft(0);
      setShowOverlay(false);
    }
  };

  const onClickStartInterview = async () => {
    if (calibCooling || !calibStarted || isRecording) return;
    try {
      if (!interviewNo) {
        alert("interviewNo가 없습니다. 이전 단계에서 세션을 생성하고 다시 시도하세요.");
        return;
      }
      if (!stream) await getMediaPermission();
      setIsRecording(true);

      if (typeof window.MediaRecorder === "undefined") {
        throw new Error("이 브라우저는 MediaRecorder를 지원하지 않습니다.");
      }

      const tryTypes = [FALLBACK_WEBM_VP9, FALLBACK_WEBM_VP8, FALLBACK_WEBM];
      let rec = null;
      let usedType = "";
      for (const t of tryTypes) {
        if (isTypeSupported(t)) {
          rec = new MediaRecorder(stream, { mimeType: t });
          usedType = t;
          break;
        }
      }
      if (!rec) {
        rec = new MediaRecorder(stream);
        usedType = rec.mimeType || "";
      }
      recordedTypeRef.current = usedType;
      mediaRecorderRef.current = rec;

      const chunks = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      rec.onstop = async () => {
        try {
          const type = recordedTypeRef.current || chunks[0]?.type || "video/webm";
          const merged = new Blob(chunks, { type });
          await uploadCalibration(interviewNo, merged, type);
          navigate(`${NEXT_BASE}/${interviewNo}`, { state: { interviewNo } });
        } catch (e) {
          console.error(e);
          alert(`업로드 오류: ${e.message ?? ""}`);
        } finally {
          setIsRecording(false);
        }
      };

      rec.start();
      setTimeout(() => {
        if (rec && rec.state !== "inactive") rec.stop();
      }, RECORD_DURATION_MS);
    } catch (e) {
      console.error(e);
      alert(e.message ?? "면접 시작 중 오류 발생");
      setIsRecording(false);
    }
  };

  const startDisabled = calibCooling || !calibStarted || isRecording || !interviewNo;

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold">캘리브레이션</h1>
            {!interviewNo && (
              <span className="text-sm text-rose-600">
                인터뷰 번호(interviewNo)가 없습니다. 이전 단계에서 세션을 생성해주세요.
              </span>
            )}
          </div>

          {/* 좌우 칸 정렬 */}
          <div className="grid grid-cols-12 gap-6 items-stretch">
            {/* 왼쪽: 미리보기 */}
            <div className="col-span-12 lg:col-span-7">
              <div className="h-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">캘리브레이션 미리보기</h2>
                  <button
                    onClick={onCalibrationStart}
                    disabled={calibCooling}
                    className={`h-9 px-3 rounded-lg text-sm ${
                      calibCooling
                        ? "bg-slate-200 text-slate-500"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {calibStarted
                      ? (calibCooling ? `준비 중… ${cooldownLeft}s` : "다시 맞추기")
                      : "시작하기"}
                  </button>
                </div>

                <div className="relative bg-black overflow-hidden rounded-xl">
                  <div className="w-full aspect-video">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {!showOverlay && (
                    <div className="pointer-events-none absolute inset-0 grid place-items-center z-20">
                      <div className="relative w-[260px] h-[260px] rounded-full border-2 border-white/70">
                        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[2px] bg-white/60" />
                        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
                          <span className="text-white text-sm font-medium leading-snug drop-shadow">
                            얼굴을 화면 중앙에{"\n"}맞춰주세요
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {showOverlay && (
                    <div className="absolute inset-0 bg-black/65 grid place-items-center rounded-xl z-30">
                      <div className="text-center text-white">
                        <p className="text-lg font-semibold mb-1">면접 시작 버튼을 눌러주세요</p>
                        <p className="text-sm opacity-80">아래 안내를 확인했다면 진행하셔도 됩니다</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  {calibStarted
                    ? (calibCooling ? "캘리브레이션: 준비 중…" : "캘리브레이션: 준비 완료")
                    : "캘리브레이션: 대기"}
                </div>
              </div>
            </div>

            {/* 오른쪽: 안내(위) + 시작(아래) 분리 */}
            <div className="col-span-12 lg:col-span-5">
              <div className="h-full flex flex-col gap-5">
                {/* 안내 카드 — 좌측과 높이 맞추기 위해 flex-1 */}
                <div className="flex-1 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="font-semibold mb-3">캘리브레이션 안내</h3>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
                    {GUIDE.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>

                {/* 버튼 카드 — 분리 */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="text-xs text-slate-500 mb-2">완료 준비</div>
                  <p className="text-sm text-slate-600 mb-4">
                    캘리브레이션 버튼을 누른 후 3초 뒤 안내가 뜨면, 면접을 시작할 수 있어요.
                  </p>
                  <button
                    onClick={onClickStartInterview}
                    disabled={startDisabled}
                    className={`h-10 px-4 rounded-lg w-full text-sm ${
                      !startDisabled
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-slate-200 text-slate-500 cursor-not-allowed"
                    }`}
                    title={
                      !interviewNo
                        ? "세션 생성 후 다시 시도하세요."
                        : (calibCooling || !calibStarted ? "캘리브레이션 후 진행 가능합니다." : "")
                    }
                  >
                    {isRecording ? "업로드 중..." : "면접 시작"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>


    </div>
  );
}
