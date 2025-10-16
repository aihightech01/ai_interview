// src/pages/Reports/components/EmotionOnlySynced.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import ChartDraggable from "./ChartDraggable copy";
import EmotionHeatSlider from "./EmotionHeatSlider";
import EmotionDonut from "./EmotionDonut";

/**
 * props:
 *  - emotionChartData: [{ t, neutral, happy, sad, angry, fear, disgust, surprise }, ...] // 0~100(%)
 *  - videoUrl?: string
 *  - poster?: string
 */
export default function EmotionOnlySynced({ emotionChartData = [], videoUrl = "", poster = "" }) {
  // 1) 공통 타임라인(초 단위)
  const [cursorTime, setCursorTime] = useState(0);
  const [donutMode, setDonutMode] = useState("frame"); // "frame" | "avg"

  // 2) 비디오 동기화 (rAF)
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const cursorRef = useRef(0);
  cursorRef.current = cursorTime;

  // 도표 범위: 영상 길이 우선, 없으면 데이터 마지막 t
  const totalSec = useMemo(() => {
    const t = emotionChartData.at(-1)?.t || 0;
    return (duration && Number.isFinite(duration) ? duration : 0) || t || 0;
  }, [duration, emotionChartData]);

  // 재생 중에만 video.currentTime → cursorTime
  useEffect(() => {
    let raf = 0;
    const v = videoRef.current;
    if (!v) return;

    const tick = () => {
      if (!v.paused && !v.ended) {
        const t = v.currentTime || 0;
        if (Math.abs(t - cursorRef.current) > 1 / 30) {
          setCursorTime(t);
        }
        raf = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  // 외부 조작(차트/슬라이더 클릭) → 비디오도 이동
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
      {/* 좌: 영상 (선택) */}
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
          {format(cursorTime)} / {format(totalSec)}
        </div>
      </div>

      {/* 우: 감정 시각화 3종 세트 */}
      <div className="min-w-0">
        {/* ① 라인 차트: 드래그/클릭 → setCursorTime */}
        <div className="rounded-xl border border-gray-200 bg-white p-3 min-w-0">
          <p className="text-xs text-gray-500 mb-2">프레임별 감정 확률(%)</p>
          {emotionChartData.length ? (
            <ChartDraggable
              data={emotionChartData}
              // 감정 데이터는 x축이 t(초)라고 가정
              // 만약 컴포넌트가 dataKeyX를 지원한다면 다음 줄을 열어주세요:
              // dataKeyX="t"
              duration={totalSec}
              cursorTime={cursorTime}
              onChangeTime={setCursorTime}
              series={["neutral", "happy", "sad", "angry", "fear", "disgust", "surprise"]}
              yDomain={[0, 100]}
            />
          ) : (
            <div className="text-xs text-gray-500">표시할 감정 데이터가 없습니다.</div>
          )}
        </div>

        {/* ② 극성 슬라이더: 클릭 → setCursorTime */}
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
          <EmotionHeatSlider
            data={emotionChartData}
            cursorTime={cursorTime}
            onChangeTime={setCursorTime}
            bins={7}
          />
        </div>

        {/* ③ 도넛: 읽기 전용(현재 프레임/평균 토글) */}
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">
              감정 비율 ({donutMode === "avg" ? "전체 평균" : "현재 프레임"})
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDonutMode("frame")}
                className={`h-7 px-3 rounded-md text-xs border ${
                  donutMode === "frame"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-300"
                }`}
              >
                현재 프레임
              </button>
              <button
                onClick={() => setDonutMode("avg")}
                className={`h-7 px-3 rounded-md text-xs border ${
                  donutMode === "avg"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-300"
                }`}
              >
                평균
              </button>
            </div>
          </div>

          <EmotionDonut
            data={emotionChartData}
            cursorTime={cursorTime}
            mode={donutMode}
            height={220}
          />
        </div>
      </div>
    </div>
  );
}

// 00:SS.s 포맷
function format(sec = 0) {
  const m = Math.floor(sec);
  const s = (sec - m).toFixed(1);
  const mm = Math.floor(m / 60);
  const ss = (m % 60) + s.slice(1);
  return `${String(mm).padStart(2, "0")}:${ss.padStart(4, "0")}`;
}
