import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { openStream, createMicMeter } from "../../utils/media";

export default function DeviceTest(){
  const nav = useNavigate();
  const videoRef = useRef(null);
  const [level, setLevel] = useState(0);
  const [ok, setOk] = useState({ cam:false, mic:false, spk:false, perm:false });

  // ✅ 한 번이라도 통과하면 버튼을 계속 활성화로 유지
  const [everPassed, setEverPassed] = useState(false);

  useEffect(() => {
    let stopMeter;
    (async () => {
      try {
        const stream = await openStream({ video:true, audio:true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => videoRef.current.play();
        }
        stopMeter = createMicMeter(stream, (rms) => {
          setLevel(rms);
          setOk(o => ({ ...o, mic: rms > 0.02 }));
        });
        setOk(o => ({ ...o, cam:true, perm:true }));
      } catch (e) {
        console.error("DeviceTest: getUserMedia 실패", e);
        setOk(o => ({ ...o, perm:false }));
      }
    })();

    return () => stopMeter?.();
  }, []);

  // 현재 통과 여부
  const canProceed = ok.cam && ok.mic && ok.spk && ok.perm;

  // ✅ 한 번 통과했다면 고정
  useEffect(() => {
    if (canProceed && !everPassed) setEverPassed(true);
  }, [canProceed, everPassed]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">기기 테스트</h1>

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
                  backgroundColor: "#2563eb" // Tailwind의 blue-600과 동일 색상
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
                a.play();
                setOk(o => ({ ...o, spk:true }));
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

      {/* 하단 우측: 켈리브레이션 이동 버튼 (디자인 + 고정 활성화) */}
      <div className="flex justify-end">
        <button
          type="button"
          // 이미지처럼 파란 라운드 버튼
          className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
          // 한 번이라도 통과했으면(everPassed) 계속 활성화
          disabled={!(everPassed || canProceed)}
          onClick={() => nav("/interview/calibration")}
        >
          켈리브레이션으로
        </button>
      </div>
    </div>
  );
}
