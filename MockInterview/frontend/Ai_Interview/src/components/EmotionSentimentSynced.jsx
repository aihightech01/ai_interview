// src/pages/Reports/components/EmotionSentimentSynced.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import EmotionSentimentPanel from "./EmotionSentimentPanel";
import ChartDraggable from "../../../components/ChartDraggable"; // 경로 확인
// (선택) 히트슬라이더/도넛도 쓰고 싶다면:
// import EmotionHeatSlider from "./EmotionHeatSlider";
// import EmotionDonut from "./EmotionDonut";

/**
 * props:
 *  - emotionChartData: [{ t, neutral, happy, sad, angry, fear, disgust, surprise }, ...] // % 단위
 *  - videoUrl?: string
 *  - poster?: string
 *  - showVideo?: boolean   (기본 true)
 *  - startMode?: "frame" | "avg"  (Panel/Donut 표시 기준 기본 "frame")
 */
export default function EmotionSentimentSynced({
  emotionChartData = [],
  videoUrl = "",
  poster = "",
  showVideo = true,
  startMode = "frame",
}) {
  // === 공통 타임라인/표시모드 ===
  const [cursorTime, setCursorTime] = useState(0);
  const [mode, setMode] = useState(startMode); // "frame" | "avg"

  // === 비디오 동기화(rAF) ===
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const cursorRef = useRef(0);
  cursorRef.current = cursorTime;

  const totalSec = useMemo(() => {
    const t = emotionChartData.at(-1)?.t || 0;
    return (duration && Number.isFinite(duration) ? duration : 0) || t || 0;
  }, [duration, emotionChartData]);

  useEffect(() => {
    if (!showVideo) return;
    let raf = 0;
    const v = videoRef.current;
    if (!v) return;

    const tick = () => {
      if (!v.paused && !v.ended) {
        const t = v.currentTime || 0;
        // 30fps 기준 스로틀
        if (Math.abs(t - cursorRef.current) > 1 / 30) {
          setCursorTime(t);
        }
        raf = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, showVideo]);

  useEffect(() => {
    if (!showVideo) return;
    const v = videoRef.current;
    if (!v) return;
    if (Math.abs((v.currentTime || 0) - cursorTime) > 0.03) {
      v.currentTime = cursorTime;
    }
  }, [cursorTime, showVideo]);

  const onLoadedMetadata = () => {
    if (!showVideo) return;
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);
  };

  // === 현재 프레임 확률 → Panel 연결 ===
  const currentProbs = useMemo(
    () => (mode === "frame" ? nearestProbsAtTime(emotionChartData, cursorTime) : undefined),
    [emotionChartData, cursorTime, mode]
  );

  const seriesForAvg = useMemo(
    () => (mode === "avg" ? emotionChartData.map(stripToProbs) : undefined),
    [emotionChartData, mode]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 좌: 영상(옵션) + 현재/전체 시간 표시 */}
      <div className={showVideo ? "" : "hidden lg:block"}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-900">실전 면접 영상</h3>
          <div className="text-[11px] text-gray-500">{format(cursorTime)} / {format(totalSec)}</div>
        </div>

        <div className="aspect-video overflow-hidden rounded-xl bg-black/90 text-white flex items-center justify-center">
          {showVideo ? (
            videoUrl ? (
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
            )
          ) : (
            <span className="opacity-60 text-sm">영상 비표시 모드</span>
          )}
        </div>
      </div>

      {/* 우: 요약 패널 + 차트 (필수) */}
      <div className="min-w-0">
        {/* 0) 감정 요약 (현재 프레임 / 전체 평균 토글) */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            감정 요약 ({mode === "avg" ? "전체 평균" : "현재 프레임"})
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("frame")}
              className={`h-7 px-3 rounded-md text-xs border ${
                mode === "frame"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-700 border-slate-300"
              }`}
            >
              현재 프레임
            </button>
            <button
              onClick={() => setMode("avg")}
              className={`h-7 px-3 rounded-md text-xs border ${
                mode === "avg"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-700 border-slate-300"
              }`}
            >
              평균
            </button>
          </div>
        </div>

        <div className="mb-3">
          <EmotionSentimentPanel
            // frame 모드면 probs, avg 모드면 series를 전달
            probs={currentProbs}
            series={seriesForAvg}
            title={mode === "avg" ? "감정 요약 (전체 평균)" : "감정 요약 (현재 프레임)"}
          />
        </div>

        {/* 1) 드래그 가능한 라인 차트 */}
        <div className="rounded-xl border border-gray-200 bg-white p-3 min-w-0">
          <p className="text-xs text-gray-500 mb-2">프레임별 감정 확률(%)</p>
          {emotionChartData?.length ? (
            <ChartDraggable
              data={emotionChartData}
              duration={totalSec}
              cursorTime={cursorTime}
              onChangeTime={setCursorTime}
              series={["neutral", "happy", "sad", "angry", "fear", "disgust", "surprise"]}
              yDomain={[0, 100]}
              // 옵션: fps={30} snapToData
              fps={30}
              snapToData
            />
          ) : (
            <div className="text-xs text-gray-500">표시할 감정 데이터가 없습니다.</div>
          )}
        </div>

        {/* (선택) 히트슬라이더/도넛 추가 섹션
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
          <EmotionHeatSlider data={emotionChartData} cursorTime={cursorTime} onChangeTime={setCursorTime} bins={7} />
        </div>
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
          <EmotionDonut data={emotionChartData} cursorTime={cursorTime} mode={mode} height={220} />
        </div>
        */}
      </div>
    </div>
  );
}

/** utils */

function nearestProbsAtTime(data, t) {
  if (!data?.length) return undefined;
  const ticks = data.map(d => Number(d?.t) || 0);
  // 이진 탐색으로 t 이상 최초 인덱스
  let lo = 0, hi = ticks.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    (ticks[mid] < t) ? (lo = mid + 1) : (hi = mid);
  }
  const i2 = lo, i1 = Math.max(0, i2 - 1);
  const t1 = ticks[i1] ?? 0;
  const t2 = ticks[i2] ?? Infinity;
  const idx = Math.abs(t1 - t) <= Math.abs(t2 - t) ? i1 : i2;
  const row = data[idx];
  if (!row) return undefined;
  return stripToProbs(row);
}

function stripToProbs(row = {}) {
  const { happy, neutral, surprise, sad, angry, fear, disgust } = row;
  return { happy, neutral, surprise, sad, angry, fear, disgust };
}

function format(sec = 0) {
  const m = Math.floor(sec);
  const s = (sec - m).toFixed(1);
  const mm = Math.floor(m / 60);
  const ss = (m % 60) + s.slice(1);
  return `${String(mm).padStart(2, "0")}:${ss.padStart(4, "0")}`;
}
