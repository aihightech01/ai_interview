// src/components/FocusOnlySynced.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import ChartDraggable from "./ChartDraggable"; // dataKeyX="tSec" 지원(없으면 기본 tSec로 그리도록 내부 처리)

function fmt(sec = 0) {
  const m = Math.floor(sec);
  const s = (sec - m).toFixed(1);
  const mm = Math.floor(m / 60);
  const ss = (m % 60) + s.slice(1);
  return `${String(mm).padStart(2, "0")}:${ss.padStart(4, "0")}`;
}

/**
 * props:
 *  - visionChartData: [{ frame, tSec, headYaw, headPitch, gazeYaw, gazePitch }, ...]
 *    * tSec(초)이 있어야 합니다. (이미 SessionDetail에서 toVisionChartData로 생성 중)
 *  - videoUrl?: string
 *  - poster?: string
 */
export default function FocusOnlySynced({ visionChartData = [], videoUrl = "", poster = "" }) {
  const [cursorTime, setCursorTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef(null);
  const cursorRef = useRef(0);
  cursorRef.current = cursorTime;

  // 전체 구간 길이: 영상 duration 우선, 없으면 데이터 마지막 tSec
  const totalSec = useMemo(() => {
    const t = visionChartData.at(-1)?.tSec || 0;
    return (duration && Number.isFinite(duration) ? duration : 0) || t || 0;
  }, [duration, visionChartData]);

  // rAF: 재생 중에는 video.currentTime → cursorTime
  useEffect(() => {
    let raf = 0;
    const v = videoRef.current;
    if (!v) return;

    const tick = () => {
      if (!v.paused && !v.ended) {
        const t = v.currentTime || 0;
        if (Math.abs(t - cursorRef.current) > 1 / 30) setCursorTime(t);
        raf = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  // 외부 조작(차트 드래그/클릭) → 비디오도 이동
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (Math.abs((v.currentTime || 0) - cursorTime) > 0.03) {
      v.currentTime = cursorTime;
    }
  }, [cursorTime]);

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 좌: 영상 */}
      <div>
        <p className="text-xs text-gray-500 mb-2">실전 면접 영상</p>
        <div className="aspect-video overflow-hidden rounded-xl bg-black/90 text-white flex items-center justify-center">
          {videoUrl ? (
            <video
              ref={videoRef}
              className="w-full h-full"
              controls
              preload="metadata"
              src={videoUrl}
              poster={poster || undefined}
              onLoadedMetadata={onLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
          ) : (
            <span className="opacity-60 text-sm">영상 소스가 없습니다.</span>
          )}
        </div>
        <div className="mt-2 text-[11px] text-gray-500">
          {fmt(cursorTime)} / {fmt(totalSec)}
        </div>
      </div>

      {/* 우: 집중도 라인차트 (X축=tSec, 드래그/클릭으로 cursorTime 변경) */}
      <div className="min-w-0">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500 mb-2">시선/머리 각도 변화 (°)</p>
          {visionChartData.length ? (
            <ChartDraggable
              data={visionChartData}
              dataKeyX="tSec"           // ★ 중요: tSec(초) 기준으로 동기화
              duration={totalSec}
              cursorTime={cursorTime}
              onChangeTime={setCursorTime}
              series={["headYaw", "gazeYaw", "headPitch", "gazePitch"]}
              yDomain={["auto", "auto"]}
            />
          ) : (
            <div className="text-xs text-gray-500">표시할 비전 데이터가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
