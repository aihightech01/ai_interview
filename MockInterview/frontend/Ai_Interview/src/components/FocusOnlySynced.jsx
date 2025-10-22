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
} from "recharts";
import { motion, useMotionValue, useSpring, useReducedMotion, useTransform } from "framer-motion";
import SttSynced from "./SttSynced";

/** mm:ss.s */
function fmt(sec = 0) {
  const m = Math.floor(sec);
  const s = (sec - m).toFixed(1);
  const mm = Math.floor(m / 60);
  const ss = (m % 60) + s.slice(1);
  return `${String(mm).padStart(2, "0")}:${ss.padStart(4, "0")}`;
}

export default function FocusOnlySynced({
  visionChartData = [],
  videoUrl = "",
  poster = "",
  sttSegments = [],
  sttTimeUnit = "s",
}) {
  // ▶ 재생/정지 커서(차트 재렌더X)
  const [cursorTime, setCursorTime] = useState(0);
  // ▶ STT는 재생 중에도 실시간(15Hz)
  const [sttTime, setSttTime] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef(null);
  const chartWrapRef = useRef(null);

  // 상태바 정렬용 플롯 bbox(컨테이너 좌표)
  const [plotRect, setPlotRect] = useState({ left: 0, top: 0, width: 0, height: 0 });

  // 전체 길이
  const totalSec = useMemo(() => {
    const t = visionChartData.at(-1)?.tSec || 0;
    return (duration && Number.isFinite(duration) ? duration : 0) || t || 0;
  }, [duration, visionChartData]);

  const xDomain = useMemo(() => {
    const maxX = totalSec || visionChartData.at(-1)?.tSec || 0;
    return [0, Math.max(0, Number(maxX) || 0)];
  }, [totalSec, visionChartData]);

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (v) setDuration(v.duration || 0);
  };

  // ⬛ 플롯 bbox 측정 (SVG → 컨테이너 좌표로 변환)
  useEffect(() => {
    if (!chartWrapRef.current) return;
    const measure = () => {
      const root = chartWrapRef.current;
      const containerRect = root.getBoundingClientRect();
      const svg = root.querySelector("svg");
      const target =
        root.querySelector(".recharts-cartesian-grid") ||
        root.querySelector(".recharts-cartesian-axis") ||
        root.querySelector(".recharts-layer.recharts-cartesian-axis") ||
        root.querySelector(".recharts-surface");

      let left = 12, top = 48;
      let width = Math.max(0, root.clientWidth - 24);
      let height = Math.max(0, root.clientHeight - 64);

      try {
        if (svg && target && target.getBBox) {
          const bb = target.getBBox();
          const svgRect = svg.getBoundingClientRect();
          left = (svgRect.left - containerRect.left) + bb.x;
          top  = (svgRect.top  - containerRect.top)  + bb.y;
          width = bb.width;
          height = bb.height;
        }
      } catch {}
      setPlotRect({ left, top, width: Math.max(0, width), height: Math.max(0, height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(chartWrapRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // ▶ 플레이헤드 모션 (리렌더 없음)
  const mvPct = useMotionValue(0);
  const prefersReduced = useReducedMotion();
  const springPct = useSpring(mvPct, prefersReduced
    ? { stiffness: 1000, damping: 100 }
    : { stiffness: 220, damping: 26, mass: 0.9 }
  );
  const leftMV = useTransform(springPct, (p) => `${p * 100}%`);

  const jumpTo = (t) => {
    const v = videoRef.current;
    const clamped = Math.max(xDomain[0], Math.min(xDomain[1], t));
    if (v) v.currentTime = clamped;
    setCursorTime(clamped);
    setSttTime(clamped);
    const pct = totalSec > 0 ? Math.min(1, Math.max(0, clamped / totalSec)) : 0;
    mvPct.set(pct);
  };

  const handleChartClick = (e) => {
    const el = chartWrapRef.current;
    if (!el) return;
    const containerRect = el.getBoundingClientRect();
    const plotLeftAbs = containerRect.left + plotRect.left;
    const w = Math.max(0, plotRect.width);
    if (w === 0) return;
    const clientX = (e && e.changedTouches ? e.changedTouches[0].clientX : e?.clientX) ?? null;
    if (clientX == null) return;
    const pct = (clientX - plotLeftAbs) / w;
    const t = xDomain[0] + (xDomain[1] - xDomain[0]) * Math.min(1, Math.max(0, pct));
    jumpTo(t);
  };

  // ▶ 재생 중: 모션만 갱신 + STT는 15Hz로 setState
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let stop = false;
    let last = 0;
    const interval = 1000 / 15;

    const onFrame = () => {
      if (stop) return;
      const t = v.currentTime || 0;
      const pct = totalSec > 0 ? Math.min(1, Math.max(0, t / totalSec)) : 0;
      mvPct.set(pct);

      const now = performance.now();
      if (now - last >= interval) {
        setSttTime(t);
        last = now;
      }
      if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(onFrame);
      else requestAnimationFrame(onFrame);
    };

    if (isPlaying) {
      if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(onFrame);
      else requestAnimationFrame(onFrame);
    }
    return () => { stop = true; };
  }, [isPlaying, totalSec, mvPct]);

  const currentScore = useMemo(() => {
    if (!visionChartData.length || totalSec === 0) return 0;
    const idx = Math.min(
      visionChartData.length - 1,
      Math.max(0, Math.floor((cursorTime / totalSec) * (visionChartData.length - 1)))
    );
    return Number(visionChartData[idx]?.score ?? 0).toFixed(1);
  }, [cursorTime, totalSec, visionChartData]);

  // 정적 차트
  const ChartStatic = useMemo(() => {
    const Memo = React.memo(function InnerChart({ data, domain, onClick }) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} onClick={onClick}>
            <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" />
            <XAxis
              dataKey="tSec"
              type="number"
              domain={domain}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={{ stroke: "#e5e7eb" }}
              tickFormatter={(t) => fmt(Number(t))}
            />
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
            <Line
              type="linear"
              dataKey="score"
              name="집중도"
              dot={false}
              isAnimationActive={false}
              stroke="rgba(8,106,234,1)"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    });
    return Memo;
  }, []);

  return (
    // ✅ 2열 그리드: 위에는 "영상 | 차트", 아래 STT는 "두 칸(span 2)"
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 🎥 영상 */}
      <div className="min-w-0">
        <p className="text-base text-gray-800 font-semibold mb-2 text-center">실전 면접 영상</p>
        <div className="aspect-video overflow-hidden rounded-2xl bg-black/90 shadow-sm flex items-center justify-center">
          {videoUrl ? (
            <video
              ref={videoRef}
              className="w-full h-full"
              controls
              playsInline
              preload="metadata"
              src={videoUrl}
              poster={poster || undefined}
              onLoadedMetadata={onLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={(e) => {
                const t = e.currentTarget.currentTime || 0;
                setIsPlaying(false);
                jumpTo(t);
              }}
              onSeeked={(e) => {
                const t = e.currentTarget.currentTime || 0;
                jumpTo(t);
              }}
              onEnded={() => {
                setIsPlaying(false);
                jumpTo(0);
              }}
            />
          ) : (
            <span className="text-gray-400 text-sm">영상 소스가 없습니다.</span>
          )}
        </div>
        <div className="mt-2 text-[11px] text-gray-500 text-center">
          {fmt(cursorTime)} / {fmt(totalSec)}
        </div>
      </div>

      {/* 📊 집중도 그래프 */}
      <div className="min-w-0">
        <p className="text-base text-gray-800 font-semibold mb-2 text-center">집중도 변화 추이</p>
        <div
          className="relative aspect-video rounded-2xl border border-gray-200 bg-white p-3 shadow-sm flex flex-col overflow-hidden"
          ref={chartWrapRef}
        >
          {/* 점수 태그 */}
          <div className="absolute top-4 right-4 z-10">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-600 text-sm font-semibold shadow-sm">
              {currentScore} 점
            </span>
          </div>

          {/* 상태바 오버레이 */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: plotRect.left,
              top: plotRect.top,
              width: plotRect.width,
              height: plotRect.height,
            }}
          >
            <motion.div className="absolute top-0 bottom-0" style={{ left: leftMV }}>
              <div className="w-[2px] h-full bg-blue-600/80" />
            </motion.div>
          </div>

          {/* 차트 본체 */}
          <div className="flex-1 min-h-0">
            <ChartStatic data={visionChartData} domain={xDomain} onClick={handleChartClick} />
          </div>
        </div>
      </div>

      {/* 🗣️ STT — 아래 줄에서 두 칸 전체 폭 사용 */}
      <div className="min-w-0 md:col-span-2">
        <p className="text-base text-gray-800 font-semibold mb-2 text-center">STT</p>
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* 높이: 필요에 맞게 조정 (예: 고정 360px or 화면 비율에 맞게) */}
          <div className="p-3">
            <SttSynced
              currentTime={isPlaying ? sttTime : cursorTime}
              segments={sttSegments}
              timeUnit={sttTimeUnit}
              maxHeight="max-h-80" // 필요하면 'h-[360px]' 등으로 고정 가능
              tokenHighlight
              approxWhenNoTokens
              smoothScroll
              debug
            />
          </div>
        </div>
      </div>
    </div>
  );
}
