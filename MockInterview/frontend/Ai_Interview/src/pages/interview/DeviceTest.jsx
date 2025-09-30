// src/pages/interview/DeviceTest.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { openStream, createMicMeter } from "../../utils/media";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function DeviceTest() {
  const nav = useNavigate();
  const { state } = useLocation();
  const interviewNo = state?.interviewNo; // 🔹 이전 페이지에서 넘겨받은 세션ID

  const videoRef = useRef(null);
  const streamRef = useRef(null); // cleanup 위해 보관
  const [level, setLevel] = useState(0);
  const [ok, setOk] = useState({ cam: false, mic: false, spk: false, perm: false });
  const [everPassed, setEverPassed] = useState(false);

  useEffect(() => {
    let stopMeter;
    (async () => {
      try {
        const stream = await openStream({ video: true, audio: true });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => videoRef.current.play();
        }

        // 마이크 레벨 미터 시작
        stopMeter = createMicMeter(stream, (rms) => {
          setLevel(rms);
          setOk((o) => ({ ...o, mic: rms > 0.02 }));
        });

        setOk((o) => ({ ...o, cam: true, perm: true }));
      } catch (e) {
        console.error("DeviceTest: getUserMedia 실패", e);
        setOk((o) => ({ ...o, perm: false }));
      }
    })();

    // 언마운트 시 정리
    return () => {
      stopMeter?.();
      streamRef.current?.getTracks?.().forEach((t) => t.stop());
    };
  }, []);

  const canProceed = ok.cam && ok.mic && ok.spk && ok.perm;

  useEffect(() => {
    if (canProceed && !everPassed) setEverPassed(true);
  }, [canProceed, everPassed]);



  const goCalibration = () => {
    // 🔹 interviewNo를 state로 실어보냄
    nav("/interview/calibration", { state: { interviewNo } });
  };

  const nextDisabled = !(everPassed || canProceed) || !interviewNo;

  return (
    <div className="min-h-screen w-full bg-[#F7FAFC] flex flex-col">
      {/* ✅ 공통 헤더 */}
      <Header />

      {/* 메인 */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">기기 테스트</h1>
            {!interviewNo && (
              <span className="text-sm text-rose-600">
                인터뷰 번호(interviewNo)가 없습니다. 이전 단계에서 세션을 생성해주세요.
              </span>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 왼쪽: 카메라/마이크 */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl border bg-white">
                <div className="text-sm text-slate-600 mb-2">Webcam</div>
                <video
                  ref={videoRef}
                  className="w-full aspect-video rounded-lg bg-slate-100"
                  muted
                  playsInline
                />
              </div>

              <div className="p-4 rounded-xl border bg-white">
                <div className="text-sm text-slate-700 mb-2">마이크 입력</div>
                <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, level * 300)}%`,
                      backgroundColor: "#2563eb",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 오른쪽: 체크리스트 & 스피커 테스트 */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl border bg-white">
                <div className="font-medium mb-3">체크리스트</div>
                <ul className="text-sm space-y-2 text-slate-700">
                  <li>{ok.cam ? "✅" : "⏳"} 카메라 미리보기 정상 표시</li>
                  <li>{ok.mic ? "✅" : "⏳"} 마이크 입력 레벨 감지</li>
                  <li>{ok.spk ? "✅" : "⏳"} 스피커 테스트 완료(테스트음 재생)</li>
                  <li>{ok.perm ? "✅" : "❌"} 브라우저 권한 허용됨</li>
                </ul>

                  <button
                    type="button"
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      const a = new Audio("/beep.mp3");
                      a.play().catch(err => console.warn("스피커 테스트 재생 실패:", err));
                      setOk(o => ({ ...o, spk: true })); // 실패해도 통과 처리
                    }}
                  >
                    스피커 테스트
                  </button>


              </div>

              <div className="p-4 rounded-xl border bg-white">
                <div className="text-sm text-slate-700 mb-2">디바이스 설정</div>
                <div className="text-xs text-slate-500">카메라 / 마이크 선택</div>
              </div>
            </div>
          </div>

          {/* 하단 우측: 켈리브레이션 이동 버튼 */}
          <div className="flex justify-end">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
              disabled={nextDisabled}
              onClick={goCalibration}
              title={
                !interviewNo
                  ? "세션 생성 후 다시 시도하세요."
                  : !(everPassed || canProceed)
                  ? "기기 테스트를 완료해주세요."
                  : ""
              }
            >
              켈리브레이션으로
            </button>
          </div>
        </div>
      </main>

      {/* ✅ 공통 푸터 */}
      <Footer containerClass="max-w-6xl" />
    </div>
  );
}
