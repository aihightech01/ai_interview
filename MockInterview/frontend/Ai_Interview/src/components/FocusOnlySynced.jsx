// src/components/FocusOnlySynced.jsx
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
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
  // 타임라인 상태
  const [cursorTime, setCursorTime] = useState(0); // 정지/탐색 기준
  const [sttTime, setSttTime] = useState(0);       // 재생 중 15Hz
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef(null);

  // 차트/오버레이 래퍼 & 플롯 bbox
  const chartWrapRef = useRef(null);
  const [plotRect, setPlotRect] = useState({ left: 0, top: 0, width: 0, height: 0 });

  // 전체 길이
  const totalSec = useMemo(() => {
    const t = visionChartData.at(-1)?.tSec || 0;
    return (duration && Number.isFinite(duration) ? duration : 0) || t || 0;
  }, [duration, visionChartData]);

  // X 도메인
  const xDomain = useMemo(() => {
    const maxX = totalSec || visionChartData.at(-1)?.tSec || 0;
    return [0, Math.max(0, Number(maxX) || 0)];
  }, [totalSec, visionChartData]);

  // 차트 margin(플롯 내부 패딩) — Recharts와 동일 값 사용
  const MARGIN = { top: 20, right: 16, bottom: 22, left: 36 };
  const CHART_MARGIN = { top: 60, right: 40, bottom: 5, left: 0 };

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (v) setDuration(v.duration || 0);
  };

  /** ───────── 플롯 bbox 측정(정확 정렬) ─────────
   * 기존 useEffect → useLayoutEffect로 교체.
   * SVG/GRID가 아직 없을 때 null 접근을 피하고, 실제 렌더가 끝나면 재측정.
   */
  useLayoutEffect(() => {
    const root = chartWrapRef.current;
    if (!root) return;

    let rafId = 0;

    const safeRound = (n) => Math.max(0, Math.round(n || 0));

    const measure = () => {
      const containerRect = root.getBoundingClientRect?.();
      if (!containerRect || containerRect.width === 0 || containerRect.height === 0) {
        rafId = requestAnimationFrame(measure);
        return;
      }

      const svg = root.querySelector("svg");
      const grid =
        root.querySelector(".recharts-cartesian-grid") ||
        root.querySelector(".recharts-surface");

      // 방어: 아직 svg/grid가 없으면 다음 프레임으로 미룸
      if (!svg || !grid) {
        rafId = requestAnimationFrame(measure);
        return;
      }

      let left = MARGIN.left,
        top = MARGIN.top,
        width = Math.max(0, root.clientWidth - (MARGIN.left + MARGIN.right)),
        height = Math.max(0, root.clientHeight - (MARGIN.top + MARGIN.bottom));

      try {
        const svgRect = svg.getBoundingClientRect?.();
        if (svgRect && typeof grid.getBBox === "function") {
          const bb = grid.getBBox(); // svg 좌표계의 플롯 bbox
          left = (svgRect.left - containerRect.left) + bb.x;
          top = (svgRect.top - containerRect.top) + bb.y;
          width = bb.width;
          height = bb.height;
        } else if (svgRect) {
          // getBBox 불가 시 폴백: svg 영역에서 margin만 제외
          left = svgRect.left - containerRect.left + MARGIN.left;
          top = svgRect.top - containerRect.top + MARGIN.top;
          width = Math.max(0, svgRect.width - (MARGIN.left + MARGIN.right));
          height = Math.max(0, svgRect.height - (MARGIN.top + MARGIN.bottom));
        }
      } catch {
        // Safari 등 예외는 무시 (기본 값 유지)
      }

      setPlotRect({
        left: safeRound(left),
        top: safeRound(top),
        width: safeRound(width),
        height: safeRound(height),
      });
    };

    // 초기 측정 + 다음 프레임 보정
    measure();
    rafId = requestAnimationFrame(measure);

    // 차트 DOM 추가/변경 시 재측정
    const mo = new MutationObserver(() => measure());
    mo.observe(root, { childList: true, subtree: true });

    // 컨테이너 리사이즈 시 재측정
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);

    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(rafId);
      mo.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  /** ───────── 플레이헤드 모션(차트 리렌더 X) ───────── */
  const mvPct = useMotionValue(0);
  const prefersReduced = useReducedMotion();
  const springPct = useSpring(
    mvPct,
    prefersReduced ? { stiffness: 1000, damping: 100 } : { stiffness: 220, damping: 26, mass: 0.9 }
  );
  const leftMV = useTransform(springPct, (p) => `${p * 100}%`);

  const setPctFromTime = (t) => {
    const pct = totalSec > 0 ? Math.min(1, Math.max(0, t / totalSec)) : 0;
    mvPct.set(pct);
  };

  const jumpTo = (t, playAfter = false) => {
    const v = videoRef.current;
    const clamped = Math.max(xDomain[0], Math.min(xDomain[1], t));
    if (v) {
      v.currentTime = clamped;
      if (playAfter) {
        const p = v.play?.();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    }
    setCursorTime(clamped);
    setSttTime(clamped);
    setPctFromTime(clamped);
  };

  /** ───────── rVFC 15Hz 업데이트 ───────── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let stop = false;
    let last = 0;
    const interval = 1000 / 15;

    const onFrame = () => {
      if (stop) return;
      const t = v.currentTime || 0;
      setPctFromTime(t);

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
  }, [isPlaying, totalSec]);

  // 점수
  const currentScore = useMemo(() => {
    if (!visionChartData.length || totalSec === 0) return 0;
    const idx = Math.min(
      visionChartData.length - 1,
      Math.max(0, Math.floor((cursorTime / totalSec) * (visionChartData.length - 1)))
    );
    return Number(visionChartData[idx]?.score ?? 0).toFixed(1);
  }, [cursorTime, totalSec, visionChartData]);

  /** ───────── 정적 차트(한 번만 그림) ───────── */
  const ChartStatic = useMemo(() => {
    const Memo = React.memo(function InnerChart({ data, domain }) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={ CHART_MARGIN}>
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
  }, []); // 고정

  /** ───────── 스크럽(클릭/드래그) ───────── */
  const overlayRef = useRef(null);
  const wasPlayingRef = useRef(false);
  const scrubbingRef = useRef(false);
  const startXRef = useRef(0);

  const getTimeFromOverlay = (clientX) => {
    const el = overlayRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / w));
    return xDomain[0] + (xDomain[1] - xDomain[0]) * pct;
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const v = videoRef.current;
    wasPlayingRef.current = !!(v && !v.paused && !v.ended);
    scrubbingRef.current = false;
    startXRef.current = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;

    // 단순 클릭은 pointerup에서 처리(즉시 재생)
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  };

  const onPointerMove = (e) => {
    const nowX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? startXRef.current;
    if (!scrubbingRef.current && Math.abs(nowX - startXRef.current) > 4) {
      // 스크럽 시작: 재생 중이면 일시정지
      const v = videoRef.current;
      if (v && wasPlayingRef.current) v.pause();
      scrubbingRef.current = true;
    }
    if (scrubbingRef.current) {
      const t = getTimeFromOverlay(nowX);
      if (t != null) jumpTo(t, false);
    }
  };

  const onPointerUp = (e) => {
    const clientX = e.clientX ?? (e.changedTouches && e.changedTouches[0]?.clientX);
    if (scrubbingRef.current) {
      // 드래그 종료: 원래 재생 상태로 복귀
      const t = clientX != null ? getTimeFromOverlay(clientX) : null;
      if (t != null) jumpTo(t, wasPlayingRef.current);
    } else {
      // 클릭: 해당 지점으로 이동 + 재생
      if (clientX != null) {
        const t = getTimeFromOverlay(clientX);
        if (t != null) jumpTo(t, true);
      }
    }
    window.removeEventListener("pointermove", onPointerMove);
  };

  // 비디오 이벤트(디바운스)
  const playPauseTimer = useRef(null);
  const setPlayingDebounced = (val) => {
    clearTimeout(playPauseTimer.current);
    playPauseTimer.current = setTimeout(() => setIsPlaying(val), 0);
  };

  return (
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
              onPlay={() => setPlayingDebounced(true)}
              onPause={(e) => {
                // 스크럽 중 pause는 무시하고, 실제 정지 시점에만 커서 동기화
                if (!scrubbingRef.current) {
                  const t = e.currentTarget.currentTime || 0;
                  setPlayingDebounced(false);
                  setCursorTime(t);
                  setSttTime(t);
                  setPctFromTime(t);
                }
              }}
              onEnded={() => {
                setPlayingDebounced(false);
                jumpTo(0, false);
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

        {/* 패딩 없는 래퍼에 차트 + 오버레이 동시 배치 */}
        <div
          ref={chartWrapRef}
          className="relative h-60 md:h-72 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
        >
          {/* 점수 뱃지 */}
          <div className="absolute top-3 right-3 z-20">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-600 text-sm font-semibold shadow-sm">
              {currentScore} 점
            </span>
          </div>

          {/* 차트(정적) */}
          <div className="absolute inset-0">
            <ChartStatic data={visionChartData} domain={xDomain} />
          </div>

          {/* ▶ 상태바/입력 오버레이: 플롯 bbox에 정확히 맞춤 */}
          <div
            ref={overlayRef}
            className="absolute z-10 touch-none select-none"
            style={{
              left: plotRect.left,
              top: plotRect.top,
              width: plotRect.width,
              height: plotRect.height,
            }}
            onPointerDown={onPointerDown}
          >
            <motion.div className="absolute top-0 bottom-0" style={{ left: leftMV }}>
              <div className="w-[2px] h-full bg-blue-600/90" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* 🗣️ STT (전체 폭) */}
      <div className="min-w-0 md:col-span-2">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-3">
            <SttSynced
              currentTime={isPlaying ? sttTime : cursorTime}
              segments={sttSegments}
              timeUnit={sttTimeUnit}
              maxHeight="max-h-60"
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
