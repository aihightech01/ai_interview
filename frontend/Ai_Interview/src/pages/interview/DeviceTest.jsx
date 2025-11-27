// src/pages/interview/DeviceTest.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createMicMeter } from "../../utils/media";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useInterviewStore } from "../../stores/interviewStore";

export default function DeviceTest() {
  const nav = useNavigate();

  // ====== 인터뷰 스토어 ======
  const isHydrated         = useInterviewStore((s) => s.isHydrated);
  const hydrateFromSession = useInterviewStore((s) => s.hydrateFromSession);
  const interviewNo        = useInterviewStore((s) => s.interviewNo);
  const interviewTitle     = useInterviewStore((s) => s.title);
  const interviewType      = useInterviewStore((s) => s.interviewType);
  const interviewTypeLabel = useInterviewStore((s) => s.interviewTypeLabel);
  const interviewTypeColor = useInterviewStore((s) => s.interviewTypeColor);
  const setStep            = useInterviewStore((s) => s.setStep);

  // refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const stopMeterRef = useRef(null);

  // 장치 목록/선택값
  const [devices, setDevices] = useState({ cams: [], mics: [] });
  const [selected, setSelected] = useState({ camId: "", micId: "" });

  // 표시/상태
  const [level, setLevel] = useState(0);
  const [ok, setOk] = useState({ cam: false, mic: false, spk: false, perm: false });
  const [everPassed, setEverPassed] = useState(false);
  const [busy, setBusy] = useState(false);

  // 🔹 마이크 게이지
  const [gain] = useState(300);
  const rmsToPercent = (rms, g = 300) => Math.max(0, Math.min(100, Math.round(rms * g)));
  const levelColor = (p) => (p < 25 ? "#94a3b8" : p < 60 ? "#f59e0b" : "#ef4444");

  /* ================= 세션 → 스토어 하이드레이트 & 가드 ================ */
  useEffect(() => {
    hydrateFromSession();
  }, [hydrateFromSession]);

  useEffect(() => {
    if (!isHydrated) return;

    // HTTPS 가드 (localhost는 예외)
    const isSecure = window.isSecureContext || location.protocol === "https:";
    if (!isSecure && location.hostname !== "localhost") {
      alert("카메라/마이크 접근은 HTTPS 환경에서만 안정적으로 작동합니다.");
    }

    if (!interviewNo) {
      alert("면접 세션이 없습니다. 면접 선택 페이지에서 다시 시작해주세요.");
      nav("/interview/select");
      return;
    }
  }, [isHydrated, interviewNo, nav]);

  /* =================== 디바이스 & 스트림 =================== */
  async function refreshDevices() {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const cams = list.filter((d) => d.kind === "videoinput");
      const mics = list.filter((d) => d.kind === "audioinput");
      setDevices({ cams, mics });

      setSelected((prev) => ({
        camId: prev.camId || cams[0]?.deviceId || "",
        micId: prev.micId || mics[0]?.deviceId || "",
      }));
    } catch (e) {
      console.warn("enumerateDevices 실패:", e);
    }
  }

  const startStream = async ({ camId, micId }) => {
    setBusy(true);
    stopMeterRef.current?.();
    streamRef.current?.getTracks?.().forEach((t) => t.stop());
    stopMeterRef.current = null;
    streamRef.current = null;

    try {
      const constraints = {
        video: camId ? { deviceId: { exact: camId } } : true,
        audio: micId ? { deviceId: { exact: micId } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getAudioTracks().forEach((t) => (t.enabled = true));
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // 마이크 레벨
      stopMeterRef.current = createMicMeter(stream, (rms) => {
        const visual = Math.max(0, rms - 0.005);
        setLevel(visual);
        setOk((o) => ({ ...o, mic: rms > 0.02 }));
      });

      setOk((o) => ({ ...o, cam: true, perm: true }));
    } catch (e) {
      console.error("getUserMedia 실패:", e);
      setOk((o) => ({ ...o, cam: false, mic: false, perm: false }));
    } finally {
      setBusy(false);
    }
  };

  // 초기 권한 + 목록
  useEffect(() => {
    (async () => {
      try {
        const tmp = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        tmp.getTracks().forEach((t) => t.stop());
      } catch (_) {}
      await refreshDevices();
    })();

    const onChange = () => refreshDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", onChange);

    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", onChange);
      stopMeterRef.current?.();
      streamRef.current?.getTracks?.().forEach((t) => t.stop());
    };
  }, []);

  // 선택값 변경 시 새 스트림
  useEffect(() => {
    if (selected.camId || selected.micId) {
      startStream(selected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.camId, selected.micId]);

  const canProceed = ok.cam && ok.mic && ok.spk && ok.perm;
  useEffect(() => {
    if (canProceed && !everPassed) setEverPassed(true);
  }, [canProceed, everPassed]);

  const nextDisabled = !(everPassed || canProceed) || !interviewNo;
  const onSelectCam = (e) => setSelected((s) => ({ ...s, camId: e.target.value }));
  const onSelectMic = (e) => setSelected((s) => ({ ...s, micId: e.target.value }));

  const testSpeaker = () => {
    const a = new Audio("/beep.mp3");
    a.play().catch((err) => console.warn("스피커 테스트 실패:", err));
    setOk((o) => ({ ...o, spk: true }));
  };

  const goCalibration = () => {
    // 스토어 단계 진행
    setStep("CALIB");
    nav("/interview/calibration"); // interviewNo는 스토어에 있으므로 state 불필요
  };

  /* =================== UI =================== */
  return (
    <div className="min-h-screen w-full bg-[#F7FAFC] flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* 상단 */}
          <section className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-5 flex items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-900">기기 테스트</h1>
              <div className="flex items-center gap-2 text-xs">
                {interviewTitle && (
                  <span className="text-slate-500">
                    제목: <b className="text-slate-800">{interviewTitle}</b>
                  </span>
                )}
                {interviewType && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs ${
                      interviewTypeColor === "emerald"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-blue-200 bg-blue-50 text-blue-700"
                    }`}
                  >
                    {interviewTypeLabel}
                  </span>
                )}
                {!interviewNo && (
                  <span className="text-rose-600">인터뷰 번호가 없습니다. 다시 시작해주세요.</span>
                )}
              </div>
            </div>
          </section>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 왼쪽: 카메라/마이크 */}
            <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-4">
              <div>
                <div className="text-sm text-slate-700 mb-2">카메라 미리보기</div>
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-slate-100">
                  <video ref={videoRef} className="w-full aspect-video" muted playsInline />
                </div>
              </div>

              {/* 마이크 게이지 */}
              <div>
                <div className="text-sm text-slate-700 mb-2">마이크 입력</div>
                <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                  {(() => {
                    const percent = rmsToPercent(level, gain);
                    const color = levelColor(percent);
                    return (
                      <div
                        className="h-full rounded-full transition-[width] duration-100"
                        style={{
                          width: `${percent}%`,
                          background: `linear-gradient(90deg, #60a5fa, ${color})`,
                        }}
                      />
                    );
                  })()}
                </div>
                <div className="mt-2 text-xs text-slate-500 tabular-nums">
                  {busy
                    ? "장치 적용 중…"
                    : ok.mic
                    ? `마이크 입력 감지됨 • ${rmsToPercent(level, gain)}%`
                    : "말씀해 보세요 (입력 대기)"}
                </div>
              </div>
            </section>

            {/* 오른쪽: 디바이스 설정 + 체크리스트 */}
            <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-4">
              <div>
                <div className="text-sm text-slate-700 mb-2">디바이스 설정</div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">카메라</label>
                    <select
                      value={selected.camId}
                      onChange={onSelectCam}
                      className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      {devices.cams.length === 0 && <option value="">카메라 없음</option>}
                      {devices.cams.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || "카메라"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">마이크</label>
                    <select
                      value={selected.micId}
                      onChange={onSelectMic}
                      className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      {devices.mics.length === 0 && <option value="">마이크 없음</option>}
                      {devices.mics.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || "마이크"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="font-medium mb-3">체크리스트</div>
                <ul className="text-sm space-y-2 text-slate-700">
                  <li>{ok.cam ? "✅" : "⏳"} 카메라 미리보기 정상 표시</li>
                  <li>{ok.mic ? "✅" : "⏳"} 마이크 입력 레벨 감지 (rms &gt; 0.02)</li>
                  <li>{ok.spk ? "✅" : "⏳"} 스피커 테스트 완료</li>
                  <li>{ok.perm ? "✅" : "❌"} 브라우저 권한 허용됨</li>
                </ul>

                <button
                  type="button"
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={testSpeaker}
                >
                  스피커 테스트
                </button>
              </div>
            </section>
          </div>

          {/* 하단 버튼 */}
          <div className="flex justify-end">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
              disabled={nextDisabled}
              onClick={goCalibration}
            >
              켈리브레이션으로
            </button>
          </div>
        </div>
      </main>

    </div>
  );
}
