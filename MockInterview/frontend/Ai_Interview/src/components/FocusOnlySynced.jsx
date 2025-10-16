// src/components/FocusOnlySynced.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

function fmt(sec = 0) {
  const m = Math.floor(sec);
  const s = (sec - m).toFixed(1);
  const mm = Math.floor(m / 60);
  const ss = (m % 60) + s.slice(1);
  return `${String(mm).padStart(2, "0")}:${ss.padStart(4, "0")}`;
}

/**
 * props:
 *  - visionChartData: [{ frame, tSec, headYaw, headPitch, gazeYaw, gazePitch, score }, ...]
 *    * tSec(초) 필수 (toVisionChartData에서 생성)
 *  - videoUrl?: string
 *  - poster?: string
 */
export default function FocusOnlySynced({ visionChartData = [], videoUrl = "", poster = "" }) {
  const [cursorTime, setCursorTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef(null);
  const chartWrapRef = useRef(null);
  const cursorRef = useRef(0);
  cursorRef.current = cursorTime;

  // 전체 구간 길이: 영상 duration 우선, 없으면 데이터 마지막 tSec
  const totalSec = useMemo(() => {
    const t = visionChartData.at(-1)?.tSec || 0;
    return (duration && Number.isFinite(duration) ? duration : 0) || t || 0;
  }, [duration, visionChartData]);

  // 재생 중에는 video.currentTime → cursorTime 동기화
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

  // 차트 클릭/조작으로 cursorTime 변경 시 비디오도 이동
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

  // 차트 설정
  const MARGIN = { top: 10, right: 20, bottom: 10, left: 10 };
  const xDomain = useMemo(() => {
    const maxX = totalSec || visionChartData.at(-1)?.tSec || 0;
    return [0, Math.max(0, Number(maxX) || 0)];
  }, [totalSec, visionChartData]);

  // 차트 클릭 → 해당 시간으로 이동
  const handleChartClick = (e) => {
    if (e && typeof e.activeLabel === "number") {
      setCursorTime(Math.max(xDomain[0], Math.min(xDomain[1], e.activeLabel)));
      return;
    }
    // fallback: 픽셀→시간
    const el = chartWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const plotLeft = rect.left + MARGIN.left;
    const plotRight = rect.right - MARGIN.right;
    const w = Math.max(0, plotRight - plotLeft);
    if (w === 0) return;
    const clientX = (e && e.changedTouches ? e.changedTouches[0].clientX : e?.clientX) ?? null;
    if (clientX == null) return;
    const pct = (clientX - plotLeft) / w;
    const clamped = Math.min(1, Math.max(0, pct));
    const t = xDomain[0] + (xDomain[1] - xDomain[0]) * clamped;
    setCursorTime(t);
  };

  // 현재 커서에 해당하는 점수 (실시간 태그 표시)
  const currentScore = useMemo(() => {
    if (!visionChartData.length || totalSec === 0) return 0;
    const idx = Math.floor((cursorTime / totalSec) * (visionChartData.length - 1));
    return Number(visionChartData[idx]?.score ?? 0).toFixed(1);
  }, [cursorTime, totalSec, visionChartData]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 🎥 좌: 영상 */}
      <div className="min-w-0">
        <p className="text-base text-gray-800 font-semibold mb-2 text-center">실전 면접 영상</p>
        <div className="aspect-video overflow-hidden rounded-2xl bg-black/90 shadow-sm flex items-center justify-center">
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
            <span className="text-gray-400 text-sm">영상 소스가 없습니다.</span>
          )}
        </div>
        <div className="mt-2 text-[11px] text-gray-500 text-center">
          {fmt(cursorTime)} / {fmt(totalSec)}
        </div>
      </div>

      {/* 📊 우: 집중도 그래프 */}
      <div className="min-w-0 self-center">
        <div
          className="relative aspect-video rounded-2xl border border-gray-200 bg-white p-3 shadow-sm flex flex-col overflow-hidden"
          ref={chartWrapRef}
        >
          {/* 제목 */}
          <p className="text-base text-gray-800 font-semibold mb-3 text-center">
            집중도 변화 추이
          </p>

          {/* 🔵 Floating 점수 태그 (우측 상단 고정) */}
          <div className="absolute top-4 right-4">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-600 text-sm font-semibold shadow-sm">
              {currentScore} 점
            </span>
          </div>

          {/* 차트 — 높이 안정화 래퍼로 그래프 사라짐 방지 */}
          {visionChartData.length ? (
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={visionChartData} margin={MARGIN} onClick={handleChartClick}>
                  <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="tSec"
                    type="number"
                    domain={xDomain}
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={{ stroke: "#e5e7eb" }}
                    tickFormatter={(t) => fmt(Number(t))}
                  />
                  {/* ✅ Y축 0~100 고정 */}
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [`${Number(v).toFixed(1)} 점`, "집중도"]}
                    labelFormatter={(t) => `시간 ${fmt(Number(t))}`}
                  />

                  {/* 현재 커서 수직선 (실선) */}
                  <ReferenceLine x={cursorTime} stroke="#2563eb" strokeWidth={2} />

                  {/* 집중도 라인 (노란색) */}
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="집중도"
                    dot={false}
                    stroke="#086aeaff"
                    strokeWidth={4}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-xs text-gray-500">표시할 집중도 데이터가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
