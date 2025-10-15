// src/pages/interview/Calibration.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

// ===== 설정 =====
const NEXT_BASE = "/interview/run";
const CALIB_OVERLAY_DELAY_MS = 3000;   // 캘리 후 오버레이까지 대기
const RECORD_DURATION_MS = 3000;       // 녹화 길이(ms)
// 절대 URL 직행(프록시 미사용): 뒤에 슬래시 ❌
const API_BASE = (import.meta.env.VITE_API_BASE || "http://172.31.57.139:8080").replace(/\/+$/, "");

// MediaRecorder 지원 체크
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

// 체크리스트 항목
const CHECKS = [
  { id: "framing", label: "눈/카메라 라인 프레이밍 정렬" },
  { id: "eye", label: "시선 정면 유지 (면접관 응시)" },
  { id: "noise", label: "상대 잡음 조정 · 불필요 최소화" },
  { id: "light", label: "배경 정리 · 조명 준비" },
];

// ===== 유틸 =====
const mimeToExt = (mime = "video/webm") => {
  const m = (mime || "").toLowerCase();
  if (m.includes("webm")) return "webm";
  if (m.includes("mp4")) return "mp4";
  return "webm";
};

// 안전한 URL 조합 (BASE 뒤 슬래시/경로 앞 슬래시 중복 방지)
const joinUrl = (base, path) =>
  `${base.replace(/\/+$/, "")}/${String(path || "").replace(/^\/+/, "")}`;

// 캘리 영상 업로드 (multipart/form-data)
// - Content-Type 수동 지정하지 말 것(브라우저가 boundary 자동 부여)
async function uploadCalibration(interviewNo, blob, mimeType = "video/webm") {
  if (!interviewNo) throw new Error("interviewNo가 없습니다.");

  const ext = mimeToExt(mimeType);
  const filename = `calibration_${Date.now()}.${ext}`;

  const form = new FormData();
  form.append("video", blob, filename); // 서버 스펙: 필드명 "video"

  const url = joinUrl(API_BASE, `/api/interviews/${interviewNo}/calibration`);

  const res = await fetch(url, {
    method: "POST",
    body: form,
    // credentials: "include", // 쿠키 인증 필요 시 주석 해제
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`업로드 실패 (HTTP ${res.status}) ${text}`);
  }

  const data = await res.json().catch(() => ({}));
  // 명세: { "message": true } 성공 / { "message": false, "error": "..." } 실패
  if (data?.message !== true) {
    throw new Error(data?.error || "서버에서 실패 응답을 반환했습니다.");
  }
  return data;
}

const Calibration = () => {
  const navigate = useNavigate();
  const { state } = useLocation();         // DeviceTest 등 이전 단계에서 state로 전달
  const interviewNo = state?.interviewNo ?? null;

  // 체크리스트
  const [checks, setChecks] = useState({
    framing: false,
    eye: false,
    noise: false,
    light: false,
  });

  // 캘리브레이션 상태
  const [calibStarted, setCalibStarted] = useState(false);
  const [calibCooling, setCalibCooling] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // 미디어
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const mediaRecorderRef = useRef(null);
  const recordedTypeRef = useRef("");

  // 인터뷰 번호 없으면 경고만 노출 (필요 시 리다이렉트)
  useEffect(() => {
    if (!interviewNo) {
      // navigate("/interview/select", { replace: true });
    }
  }, [interviewNo, navigate]);

  // 권한 요청
  const getMediaPermission = useCallback(async () => {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    setStream(s);
    if (videoRef.current) videoRef.current.srcObject = s;
    return s;
  }, []);

  // 언마운트 시 트랙 정리
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  // stream/video 갱신 시 자동재생
  useEffect(() => {
    if (!stream) return;
    const v = videoRef.current;
    if (!v) return;
    if (v.srcObject !== stream) v.srcObject = stream;
    v.muted = true;
    v.play?.().catch(() => {});
  }, [stream]);

  // 캘리브레이션 버튼 클릭
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
            setShowOverlay(true); // 오버레이 표시
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

  // 면접 시작 버튼 클릭
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

      // 로컬 저장 없이 업로드만 수행
      rec.onstop = async () => {
        try {
          const type = recordedTypeRef.current || chunks[0]?.type || "video/webm";
          const merged = new Blob(chunks, { type });

          // 서버로 업로드(8080 직행)
          await uploadCalibration(interviewNo, merged, type);

          // 성공 시 다음 페이지 이동
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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
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

          <div className="grid grid-cols-12 gap-6">
            {/* 왼쪽: 라이브 미리보기 */}
            <div className="col-span-12 lg:col-span-8">
              <div className="rounded-xl border bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Calibration</h2>
                  <button
                    onClick={onCalibrationStart}
                    disabled={calibCooling}
                    className={`h-9 px-3 rounded ${
                      calibCooling ? "bg-slate-200 text-slate-500" : "bg-blue-600 text-white"
                    }`}
                  >
                    {calibStarted
                      ? (calibCooling ? `준비중... ${cooldownLeft}s` : "Re-Calibrate")
                      : "Start Calibration"}
                  </button>
                </div>

                <div className="relative bg-black overflow-hidden rounded-xl">
                  <div className="w-full aspect-video">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                  </div>

                  {/* 중앙 프레이밍 가이드 */}
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

                  {/* 오버레이 */}
                  {showOverlay && (
                    <div className="absolute inset-0 bg-black/65 grid place-items-center rounded-xl z-30">
                      <div className="text-center text-white">
                        <p className="text-lg font-semibold mb-1">면접 시작 버튼을 눌러주세요</p>
                        <p className="text-sm opacity-80">체크리스트를 확인한 후 진행하세요</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  {calibStarted
                    ? calibCooling
                      ? "Calibration: 준비 중..."
                      : "Calibration: 준비 완료"
                    : "Calibration: 대기"}
                </div>
              </div>
            </div>

            {/* 오른쪽: 체크리스트 & 면접 시작 */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="rounded-xl border bg-white p-6">
                <h3 className="font-semibold mb-4">체크리스트</h3>
                <div className="space-y-3 text-sm">
                  {CHECKS.map((c) => (
                    <label key={c.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name={c.id}
                        checked={checks[c.id]}
                        onChange={(e) =>
                          setChecks((prev) => ({ ...prev, [c.id]: e.target.checked }))
                        }
                        className="h-4 w-4"
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-white p-6">
                <div className="text-xs text-slate-500 mb-3">완료 준비</div>
                <p className="text-sm text-slate-600 mb-4">
                  캘리브레이션 버튼을 누른 후 3초 뒤 안내가 표시되면, 면접을 시작할 수 있어요.
                </p>
                <button
                  onClick={onClickStartInterview}
                  disabled={startDisabled}
                  className={`h-10 px-4 rounded-lg w-full ${
                    !startDisabled ? "bg-blue-600 text-white"
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
      </main>

    </div>
  );
};

export default Calibration;
