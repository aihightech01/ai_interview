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

export default function FocusOnlySynced({ visionChartData = [], videoUrl = "", poster = "" }) {
  const [cursorTime, setCursorTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef(null);
  const chartWrapRef = useRef(null);
  const cursorRef = useRef(0);
  cursorRef.current = cursorTime;

  const totalSec = useMemo(() => {
    const t = visionChartData.at(-1)?.tSec || 0;
    return (duration && Number.isFinite(duration) ? duration : 0) || t || 0;
  }, [duration, visionChartData]);

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

  const MARGIN = { top: 8, right: 16, bottom: 8, left: 8 };
  const xDomain = useMemo(() => {
    const maxX = totalSec || visionChartData.at(-1)?.tSec || 0;
    return [0, Math.max(0, Number(maxX) || 0)];
  }, [totalSec, visionChartData]);

  const handleChartClick = (e) => {
    if (e && typeof e.activeLabel === "number") {
      setCursorTime(Math.max(xDomain[0], Math.min(xDomain[1], e.activeLabel)));
      return;
    }
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 좌: 영상 */}
      <div className="min-w-0">
        <p className="text-sm text-gray-700 mb-2 text-center font-medium">실전 면접 영상</p>
        <div className="aspect-video overflow-hidden rounded-2xl bg-black/90 text-white shadow-sm">
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
            <div className="w-full h-full flex items-center justify-center opacity-70 text-sm">
              영상 소스가 없습니다.
            </div>
          )}
        </div>
        <div className="mt-2 text-[11px] text-gray-500 text-center">
          {fmt(cursorTime)} / {fmt(totalSec)}
        </div>
      </div>

      {/* 우: 그래프 */}
      <div className="min-w-0 self-center">
        <div
          className="aspect-video rounded-2xl border border-gray-200 bg-white p-3 shadow-sm flex flex-col"
          ref={chartWrapRef}
        >
          <p className="text-base text-gray-800 mb-2 text-center font-semibold">
            시선/머리 각도 변화 (°)
          </p>

          {visionChartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visionChartData} margin={MARGIN} onClick={handleChartClick}>
                <CartesianGrid stroke="#eef2f7" strokeDasharray="3 3" />
                <XAxis
                  dataKey="tSec"
                  type="number"
                  domain={xDomain}
                  tick={{ fontSize: 12, fill: "#6b7280" }}  // Tailwind gray-500
                  axisLine={{ stroke: "#e5e7eb" }}          // gray-200
                  tickLine={{ stroke: "#e5e7eb" }}
                  tickFormatter={(t) => fmt(Number(t))}
                />
                {/* Y축 라벨/눈금 제거 */}
                <YAxis domain={["auto", "auto"]} tick={false} axisLine={false} tickLine={false} width={0} />

                <Tooltip
                  formatter={(v, name) => [`${Number(v).toFixed(2)}°`, name]}
                  labelFormatter={(t) => `t=${fmt(Number(t))}`}
                />

                {/* 0선: 연한 실선 */}
                <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1} />

                {/* 현재 커서 수직선: 진한 실선 */}
                <ReferenceLine x={cursorTime} stroke="#2563eb" strokeWidth={2} ifOverflow="extendDomain" />

                <Line type="monotone" dataKey="headYaw"   name="Head Yaw"   dot={false} stroke="#2563eb" strokeWidth={2} />
                <Line type="monotone" dataKey="gazeYaw"   name="Gaze Yaw"   dot={false} stroke="#16a34a" strokeWidth={2} />
                <Line type="monotone" dataKey="headPitch" name="Head Pitch" dot={false} stroke="#7c3aed" strokeWidth={1.5} />
                <Line type="monotone" dataKey="gazePitch" name="Gaze Pitch" dot={false} stroke="#ea580c" strokeWidth={1.5} />

                {/* Legend/Brush 제거로 깔끔 */}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-gray-500">표시할 비전 데이터가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
