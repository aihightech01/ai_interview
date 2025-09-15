import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { openStream, createMicMeter } from "../../utils/media";
// Figma: 카메라 미리보기, 마이크 입력 레벨, 스피커 테스트, 체크리스트 → 켈리브레이션  :contentReference[oaicite:8]{index=8}

export default function DeviceTest() {
  const videoRef = useRef(null);
  const [level, setLevel] = useState(0);
  const [ok, setOk] = useState({
    cam: false,
    mic: false,
    spk: false,
    perm: false,
  });

  useEffect(() => {
    let stopMeter;
    (async () => {
      try {
        const stream = await openStream({ video: true, audio: true });
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current.play();
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
    return () => stopMeter?.();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">기기 테스트</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <video
            ref={videoRef}
            className="w-full rounded-xl bg-black"
            muted
            playsInline
          />
          <div className="text-sm">마이크 레벨</div>
          <div className="h-2 rounded bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-black"
              style={{ width: `${Math.min(100, level * 300)}%` }}
            />
          </div>
        </div>
        <div className="space-y-3">
          <div className="p-4 border rounded-xl">
            <div className="font-medium mb-2">체크리스트</div>
            <ul className="text-sm space-y-1">
              <li>✅ 카메라 미리보기 정상 표시</li>
              <li>{ok.mic ? "✅" : "⏳"} 마이크 입력 레벨 감지</li>
              <li>{ok.spk ? "✅" : "⏳"} 스피커 테스트 완료</li>
              <li>{ok.perm ? "✅" : "❌"} 브라우저 권한 허용</li>
            </ul>
            <button
              className="btn btn-outline mt-3"
              onClick={() => {
                const a = new Audio("/beep.mp3");
                a.play();
                setOk((o) => ({ ...o, spk: true }));
              }}
            >
              스피커 테스트
            </button>
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Link to="/interview/calibration" className="btn btn-primary">
          캘리브레이션
        </Link>
      </div>
    </div>
  );
}
