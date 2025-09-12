// src/pages/interview/RecordPage.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { LuVolume2 } from "react-icons/lu";

// ===== 환경설정 =====
// .env에 VITE_API_BASE를 넣으면 서버 전송, 없으면 모크(로컬 저장)로 동작합니다.
// 예) VITE_API_BASE=http://localhost:3000/api
const API_BASE = (import.meta.env?.VITE_API_BASE || "").trim();
const USE_MOCK = API_BASE === "";

// 체크리스트 항목
const CHECKS = [
  { id: "framing", label: "눈/카메라 라인 프레이밍 정렬" },
  { id: "eye", label: "시선 정면 유지 (면접관 응시)" },
  { id: "noise", label: "상대 잡음 조정 · 불필요 최소화" },
  { id: "light", label: "배경 정리 · 조명 준비" },
];

const RecordPage = () => {
  // 단계: 'calibration' | 'record'
  const [step, setStep] = useState("calibration");

  // 체크리스트 상태
  const [checks, setChecks] = useState({
    framing: false,
    eye: false,
    noise: false,
    light: false,
  });
  const allChecked = Object.values(checks).every(Boolean);

  // 캘리브레이션(스냅샷) 업로드 상태
  const [calibStarted, setCalibStarted] = useState(false);
  const [calibUploading, setCalibUploading] = useState(false);
  const [calibUploaded, setCalibUploaded] = useState(false);

  // 미디어
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const mediaRecorderRef = useRef(null);

  // 녹화 단계 상태
  const [status, setStatus] = useState(
    /** @type {'pending'|'preparing'|'recording'|'proceeding'|'uploading'|'ending'} */ ("pending")
  );
  const [recordedBlobs, setRecordedBlobs] = useState([]);
  const [btnText, setBtnText] = useState("다음");

  // 체크박스 핸들러
  const handleChecklistChange = (e) => {
    const { name, checked } = e.target;
    setChecks((prev) => ({ ...prev, [name]: checked }));
  };

  // 권한 요청 + 미리보기 연결
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

  // step/stream이 바뀔 때 새 <video>에 스트림 다시 꽂기 + 자동재생 보장
  useEffect(() => {
    if (!stream) return;
    const v = videoRef.current;
    if (!v) return;
    if (v.srcObject !== stream) v.srcObject = stream;
    v.muted = true; // 모바일/사파리 자동재생 이슈 회피
    v.play?.().catch(() => {});
  }, [stream, step]);

  // 녹화 버튼 텍스트
  useEffect(() => {
    switch (status) {
      case "pending":
        setBtnText("다음");
        break;
      case "preparing":
        setBtnText("녹화시작");
        break;
      case "recording":
        setBtnText("");
        break;
      case "proceeding":
        setBtnText("녹화종료");
        break;
      case "uploading":
        setBtnText("");
        break;
      case "ending":
        setBtnText("");
        break;
      default:
        setBtnText("다음");
    }
  }, [status]);

  // ===== 공통 유틸 =====
  const saveBlobLocally = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== API 래퍼 (모크/실서버 공용) =====
  const uploadCalibration = async (snapshotBlob) => {
    if (USE_MOCK) {
      // 로컬 저장으로 대체
      saveBlobLocally(snapshotBlob, `calibration_${Date.now()}.jpg`);
      await new Promise((r) => setTimeout(r, 200));
      return { ok: true, mock: true };
    }
    const file = new File([snapshotBlob], `calibration_${Date.now()}.jpg`, { type: "image/jpeg" });
    const fd = new FormData();
    fd.append("snapshot", file);
    fd.append("checks", JSON.stringify(checks));
    const res = await fetch(`${API_BASE}/calibration`, { method: "POST", body: fd });
    return res;
  };

  const uploadVideo = async (blob) => {
    if (USE_MOCK) {
      saveBlobLocally(blob, `interview_${Date.now()}.webm`);
      await new Promise((r) => setTimeout(r, 400));
      return { ok: true, mock: true };
    }
    const file = new File([blob], `interview_${Date.now()}.webm`, { type: blob.type });
    const fd = new FormData();
    fd.append("video", file);
    const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: fd });
    return res;
  };

  // ① 캘리브레이션 시작 → 카메라 ON + 스냅샷 업로드/저장
  const onCalibrationStart = async () => {
    try {
      setCalibStarted(true);
      await getMediaPermission();

      // 비디오 준비 대기
      await new Promise((resolve) => {
        const v = videoRef.current;
        if (!v) return resolve();
        if (v.readyState >= 2) return resolve();
        const onLoaded = () => {
          resolve();
          v.removeEventListener("loadeddata", onLoaded);
        };
        v.addEventListener("loadeddata", onLoaded);
      });

      // 한 프레임 캡처 → JPG Blob
      const v = videoRef.current;
      const canvas = document.createElement("canvas");
      const W = v.videoWidth || 640;
      const H = v.videoHeight || 480;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(v, 0, 0, W, H);
      const snapshotBlob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.92));
      if (!snapshotBlob) throw new Error("스냅샷 생성 실패");

      // 업로드/저장
      setCalibUploading(true);
      const res = await uploadCalibration(snapshotBlob);
      if (!res.ok) {
        const msg = res.status ? `서버 응답 ${res.status}` : "전송 실패";
        throw new Error(msg);
      }
      setCalibUploaded(true);
    } catch (e) {
      console.error(e);
      alert(`캘리브레이션 중 오류가 발생했습니다.\n${e.message ?? ""}`);
      setCalibStarted(false);
      setCalibUploaded(false);
    } finally {
      setCalibUploading(false);
    }
  };

  // ② 면접 시작(녹화 단계로 전환)
  const onNextClick = async () => {
    if (step === "calibration") {
      if (!(allChecked && calibUploaded)) return; // 모든 체크 + 업로드/저장 완료 시 진행
      setStep("record");
      setStatus("pending");
      return;
    }

    // 녹화 플로우 ─ 스트림 없으면 재요청
    if (!stream) {
      try {
        await getMediaPermission();
      } catch {
        alert("카메라와 마이크 권한이 필요합니다.");
        return;
      }
    }

    if (status === "pending") setStatus("preparing");
    else if (status === "preparing") {
      setStatus("proceeding");
      handleStartRecording();
    } else if (status === "proceeding") {
      setStatus("uploading");
      handleStopRecording();
    }
  };

  // 녹화 시작
  const handleStartRecording = () => {
    if (typeof window.MediaRecorder === "undefined") {
      alert("이 브라우저는 MediaRecorder를 지원하지 않습니다.");
      return;
    }

    setRecordedBlobs([]);
    if (!stream) {
      alert("카메라/마이크가 준비되지 않았어요!");
      return;
    }
    try {
      const opts = [
        { mimeType: "video/webm; codecs=vp9" },
        { mimeType: "video/webm; codecs=vp8" },
        { mimeType: "video/webm" },
      ];
      let rec = null;
      for (const o of opts) {
        try {
          rec = new MediaRecorder(stream, o);
          break;
        } catch {}
      }
      if (!rec) rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) setRecordedBlobs((p) => [...p, e.data]);
      };
      rec.start();
    } catch (e) {
      console.error("MediaRecorder 에러:", e);
      alert("이 브라우저에서는 녹화가 어려울 수 있어요.");
    }
  };

  // 녹화 종료
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  // 녹화 업로드/저장
  useEffect(() => {
    const uploadIfNeeded = async () => {
      if (status !== "uploading") return;
      if (!recordedBlobs.length) return;
      try {
        const blob = new Blob(recordedBlobs, { type: recordedBlobs[0]?.type || "video/webm" });
        const res = await uploadVideo(blob);
        if (!res.ok) throw new Error(res.status ? `서버 응답 ${res.status}` : "전송 실패");
        setStatus("ending");
      } catch (err) {
        console.error(err);
        alert(`업로드 중 오류가 발생했어요.\n${err.message ?? ""}`);
        setStatus("proceeding");
      }
    };
    uploadIfNeeded();
  }, [recordedBlobs, status]);

  // 다시하기
  const restart = () => {
    setRecordedBlobs([]);
    setStatus("pending");
    setStep("calibration");
    setChecks({ framing: false, eye: false, noise: false, light: false });
    setCalibStarted(false);
    setCalibUploaded(false);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(null);
  };

  // ========== ① 캘리브레이션 화면 ==========
  if (step === "calibration") {
    const canStartInterview = allChecked && calibUploaded;

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
            {/* 왼쪽: 라이브 미리보기 + 오버레이 가이드 */}
            <div className="col-span-12 lg:col-span-8">
              <div className="rounded-xl border bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">캘리브레이션</h2>
                  <button
                    onClick={onCalibrationStart}
                    disabled={calibUploading}
                    className={`h-9 px-3 rounded ${
                      calibUploading ? "bg-slate-200 text-slate-500" : "bg-blue-600 text-white"
                    }`}
                  >
                    {calibStarted ? (calibUploading ? "보내는 중..." : "다시 캘리브레이션") : "캘리브레이션 시작"}
                  </button>
                </div>

                {/* 미리보기 박스 */}
                <div className="relative bg-black overflow-hidden rounded-xl">
                  <div className="w-full aspect-video">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                  </div>

                  {/* 오버레이: 중앙 원 + 눈높이 라인 + 텍스트 */}
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="relative w-[260px] h-[260px] rounded-full border-2 border-white/80">
                      <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[2px] bg-white/70" />
                      <div className="absolute inset-0 flex items-center justify-center text-center px-4">
                        <span className="text-white font-semibold leading-snug drop-shadow">
                          얼굴을 화면 중앙에{"\n"}맞춰주세요
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 하단 토스트 안내 */}
                  <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-6 w-[90%] max-w-xl">
                    <div className="bg-black/70 text-white rounded-xl px-4 py-3 shadow">
                      <div className="flex items-start gap-2 text-sm leading-relaxed">
                        <LuVolume2 className="mt-0.5 shrink-0" />
                        <span>
                          면접 연습은 카페나 시끄러운 곳이 아닌 조용한 장소에서 진행해주세요.
                          <br />
                          주변 소음이 섞이게 되면 정확한 분석이 어려울 수 있습니다.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 업로드 상태 */}
                <div className="mt-3 text-xs text-slate-500">
                  캘리브레이션:{" "}
                  {calibUploaded
                    ? USE_MOCK
                      ? "✅ 완료(로컬 저장)"
                      : "✅ 완료(서버 전송)"
                    : calibUploading
                    ? USE_MOCK
                      ? "로컬 저장 중..."
                      : "업로드 중..."
                    : "대기 중"}
                </div>
              </div>
            </div>

            {/* 오른쪽: 체크리스트 / 면접 시작 */}
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
                        onChange={handleChecklistChange}
                        className="h-4 w-4"
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-white p-6">
                <div className="text-xs text-slate-500 mb-4">완료 준비</div>
                <p className="text-sm text-slate-600 mb-4">
                  캘리브레이션 스냅샷 전송(또는 로컬 저장)과 체크리스트 완료 후 면접을 시작할 수 있어요.
                </p>
                <button
                  onClick={onNextClick}
                  disabled={!(allChecked && calibUploaded)}
                  className={`h-10 px-4 rounded-lg w-full ${
                    allChecked && calibUploaded
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  면접 시작
                </button>

                {/* 체크 진행도 */}
                <div className="mt-3 h-2 rounded bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{
                      width: `${
                        (Object.values(checks).filter(Boolean).length / CHECKS.length) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="text-xs text-slate-400 py-10 text-center">
          © 2025 AI 면접 코치. All rights reserved. 문의: support@example.com
        </footer>
      </div>
    );
  } // ← 캘리브레이션 화면 끝

  // ========== ② 녹화 화면 ==========
  return (
    <div className="min-h-screen grid place-items-center bg-[#0b0b0c] p-4">
      <div className="w-[940px] max-w-[95vw]">
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-lg text-white text-center flex-1">
            {!stream
              ? "카메라, 마이크를 준비중입니다"
              : status === "pending"
              ? "다음 버튼을 눌러주세요"
              : status === "preparing"
              ? "녹화를 시작해볼까요?"
              : status === "proceeding"
              ? "녹화 중입니다"
              : status === "uploading"
              ? USE_MOCK
                ? "로컬 저장 중..."
                : "업로드 중..."
              : status === "ending"
              ? "면접이 종료되었습니다"
              : ""}
          </p>
          {btnText && status !== "ending" && (
            <button
              onClick={onNextClick}
              className={`h-9 px-3 rounded text-white ml-3 ${
                stream ? "bg-blue-600" : "bg-slate-400 cursor-not-allowed"
              }`}
            >
              {btnText}
            </button>
          )}
        </div>

        <div className="relative bg-black p-6 rounded-xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="block mx-auto w-[640px] h-[480px] rounded-md"
          />
          {status === "proceeding" && (
            <div className="text-center mt-3">
              <button
                onClick={() => {
                  setStatus("uploading");
                  handleStopRecording();
                }}
                className="h-9 px-3 rounded bg-red-500 text-white"
              >
                녹화종료
              </button>
            </div>
          )}

          {status === "ending" && (
            <div className="absolute inset-0 bg-black/70 grid place-items-center text-white rounded-xl">
              <div className="text-center">
                <h2 className="text-2xl mb-2">면접이 종료되었습니다</h2>
                <p className="mb-4">
                  {USE_MOCK ? "영상이 로컬로 저장되었습니다." : "업로드가 완료되었습니다."}
                </p>
                <button
                  onClick={restart}
                  className="h-10 px-4 rounded bg-slate-100 text-slate-900"
                >
                  다시하기
                </button>
              </div>
            </div>
          )}
        </div>

        {recordedBlobs.length > 0 &&
          status !== "uploading" &&
          status !== "proceeding" &&
          status !== "recording" && (
            <div className="mt-3 text-center">
              <button
                onClick={() => {
                  const blob = new Blob(recordedBlobs, {
                    type: recordedBlobs[0]?.type || "video/webm",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `interview_${Date.now()}.webm`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="h-9 px-3 rounded bg-emerald-500 text-white"
              >
                내 PC로 저장(webm)
              </button>
            </div>
          )}
      </div>
    </div>
  );
};

export default RecordPage;
