// src/pages/interview/Calibration.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// ===== 설정 =====
const NEXT_PATH = "/interview/run/:sessionId"; // 저장 후 이동할 경로
const CALIB_OVERLAY_DELAY_MS = 3000;   // 캘리브레이션 후 오버레이까지 대기
const RECORD_DURATION_MS = 3000;       // 저장할 영상 길이

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

const Calibration = () => {
  const navigate = useNavigate();

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
    v.play?.().catch(() => { });
  }, [stream]);

  // 파일 저장
  const saveBlobLocally = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 캘리브레이션 버튼 클릭
  const onCalibrationStart = async () => {
    try {
      setCalibStarted(true);
      setShowOverlay(false);
      if (!stream) await getMediaPermission();

      setCalibCooling(true);
      setCooldownLeft(CALIB_OVERLAY_DELAY_MS / 1000);
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

      rec.onstop = () => {
        try {
          const type = recordedTypeRef.current || chunks[0]?.type || "video/webm";
          const merged = new Blob(chunks, { type });
          saveBlobLocally(merged, `calibration_${Date.now()}.webm`);
        } catch (e) {
          console.error(e);
          alert(`저장 오류: ${e.message ?? ""}`);
        } finally {
          setIsRecording(false);
          navigate(NEXT_PATH);
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

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* 헤더 */}
      <div className="border-b bg-white">
        <div className="mx-auto w-full max-w-6xl h-14 flex items-center justify-between px-4">
          <div className="font-semibold">AI 면접 코치</div>
          <div className="space-x-2 text-sm">
            <button className="px-3 py-1 rounded border">마이페이지</button>
            <button className="px-3 py-1 rounded border">로그인</button>
            <button className="px-3 py-1 rounded bg-blue-600 text-white">회원가입</button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* 왼쪽: 라이브 미리보기 */}
          <div className="col-span-12 lg:col-span-8">
            <div className="rounded-xl border bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Calibration</h2>
                <button
                  onClick={onCalibrationStart}
                  disabled={calibCooling}
                  className={`h-9 px-3 rounded ${calibCooling ? "bg-slate-200 text-slate-500" : "bg-blue-600 text-white"
                    }`}
                >
                  {calibStarted
                    ? (calibCooling ? `준비중... ${cooldownLeft}s` : "테스트 재시작")
                    : "테스트 시작"}
                </button>
              </div>

              <div className="relative bg-black overflow-hidden rounded-xl">
                <div className="w-full aspect-video">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                </div>

                {/* ✅ 중앙 프레이밍 가이드 — 오버레이가 없을 때만 표시 */}
                {/* ✅ 중앙 프레이밍 가이드 — 오버레이가 없을 때만 표시 */}
                {!showOverlay && (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center z-20">
                    <div className="relative w-[260px] h-[260px] rounded-full border-2 border-white/70">
                      {/* 안내 문구 */}
                      <div className="absolute inset-0 flex items-center justify-center text-center px-4">
                        <p className="text-white text-sm font-medium leading-relaxed drop-shadow">
                          얼굴을 화면 중앙에<br />
                          맞춰주세요
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3초 후 어두운 오버레이 + 안내 문구 */}
                {showOverlay && (
                  <div className="absolute inset-0 bg-black/65 grid place-items-center rounded-xl z-30">
                    <div className="text-center text-white">
                      <p className="text-lg font-semibold mb-1">면접 시작 버튼을 눌러주세요</p>
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

          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="rounded-xl border bg-white p-6">
              <div className="text-xs text-slate-500 mb-3">완료 준비</div>
              <p className="text-sm text-slate-600 mb-4">
                캘리브레이션 버튼을 누른 후 3초 뒤 안내가 표시되면, 면접을 시작할 수 있어요.
              </p>
              <button
                onClick={onClickStartInterview}
                disabled={calibCooling || !calibStarted || isRecording}
                className={`h-10 px-4 rounded-lg w-full ${!calibCooling && calibStarted && !isRecording
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-500 cursor-not-allowed"
                  }`}
              >
                {isRecording ? "저장 중..." : "면접 시작"}
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Calibration;
