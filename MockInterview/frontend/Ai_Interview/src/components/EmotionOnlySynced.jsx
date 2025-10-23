// src/pages/Reports/components/EmotionOnlySynced.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
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
import EmotionHeatSlider from "./EmotionHeatSlider";
import SttSynced from "../components/SttSynced";

/** mm:ss.s */
function fmt(sec = 0) {
  const m = Math.floor(sec);
  const s = (sec - m).toFixed(1);
  const mm = Math.floor(m / 60);
  const ss = (m % 60) + s.slice(1);
  return `${String(mm).padStart(2, "0")}:${ss.padStart(4, "0")}`;
}

/**
 * props:
 *  - emotionChartData: [{ t, neutral, happy, sad, angry, fear, disgust, surprise }, ...] // % (0~100)
 *  - videoUrl?: string
 *  - poster?: string
 *  - sttSegments?: SttSynced props: [{start, end, text, ...}]
 *  - sttTimeUnit?: "s" | "ms" (default "s")
 *  - sliderBins?: number (EmotionHeatSlider bins)
 */
export default function EmotionOnlySynced({
  emotionChartData = [],
  videoUrl = "",
  poster = "",
  sttSegments = [],
  sttTimeUnit = "s",
  sliderBins = 7,
}) {
  // ───────── 타임라인 상태 ─────────
  const [cursorTime, setCursorTime] = useState(0); // 정지/탐색 기준
  const [sttTime, setSttTime] = useState(0);       // 재생 중 15Hz
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef(null);

  // ───────── 감정(AES) 계산 (0~100) ─────────
  const VALENCE_MAP = useMemo(() => ({
    angry: -0.9, disgust: -0.7, fear: -0.8, sad: -0.9,
    happy: 0.9, surprise: 0.3, neutral: 0.0,
  }), []);
  const AROUSAL_MAP = useMemo(() => ({
    angry: 0.8, disgust: 0.4, fear: 0.9, sad: 0.2,
    happy: 0.7, surprise: 1.0, neutral: 0.1,
  }), []);
  const LABELS = useMemo(() => ["angry","disgust","fear","happy","sad","surprise","neutral"], []);

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const pctToProb = (v) => clamp01((v || 0) / 100);
  const normalize = (arr) => {
    const s = arr.reduce((a,b)=>a+b, 0);
    if (!isFinite(s) || s <= 0) return arr.map(()=>0);
    return arr.map(v => v / s);
  };
  const entropy = (probs) => {
    const eps = 1e-12; let H = 0;
    for (const p of probs) { const pp = Math.max(p, eps); H += -pp * Math.log(pp); }
    return H;
  };
  const toProbArray = (row) => normalize(LABELS.map(lb => pctToProb(row?.[lb])));
  const computeAES01 = (row) => {
    const probs = toProbArray(row);
    let V = 0, A = 0;
    for (let i=0;i<LABELS.length;i++) {
      const lb = LABELS[i];
      V += probs[i] * (VALENCE_MAP[lb] ?? 0);
      A += probs[i] * (AROUSAL_MAP[lb] ?? 0.5);
    }
    const Vn = (V + 1) / 2; // [-1,1] → [0,1]
    const C = 1 - (LABELS.length ? entropy(probs) / Math.log(LABELS.length) : 0); // [0,1]
    return clamp01(0.4 * Vn + 0.4 * clamp01(A) + 0.2 * clamp01(C));
  };

  // ───────── 차트용 시계열 (정적) ─────────
  const aesSeries = useMemo(() => {
    if (!emotionChartData.length) return [];
    return emotionChartData.map((row) => ({
      tSec: row.t || 0,
      aes: Math.round(computeAES01(row) * 1000) / 10, // 0~100 소수 1자리
    }));
  }, [emotionChartData, computeAES01]);

  // ───────── 전체 길이 ─────────
  const totalSec = useMemo(() => {
    const t = aesSeries.at(-1)?.tSec || 0;
    return (duration && Number.isFinite(duration) ? duration : 0) || t || 0;
  }, [duration, aesSeries]);

  // ───────── X 도메인 ─────────
  const xDomain = useMemo(() => {
    const maxX = totalSec || aesSeries.at(-1)?.tSec || 0;
    return [0, Math.max(0, Number(maxX) || 0)];
  }, [totalSec, aesSeries]);

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (v) setDuration(v.duration || 0);
  };

  // ───────── 차트/오버레이 래퍼 & 플롯 bbox ─────────
  const chartWrapRef = useRef(null);
  const [plotRect, setPlotRect] = useState({ left: 0, top: 0, width: 0, height: 0 });

  // Recharts margin 상수 (플롯 내부 패딩 계산용)
  const MARGIN = { top: 20, right: 16, bottom: 22, left: 36 };
  const CHART_MARGIN = { top: 60, right: 40, bottom: 5, left: 0 };

  /** 플롯 bbox를 정확히 측정해서 상태바/스क्र럽 오버레이 정렬 */
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
          const bb = grid.getBBox();
          left = (svgRect.left - containerRect.left) + bb.x;
          top = (svgRect.top - containerRect.top) + bb.y;
          width = bb.width;
          height = bb.height;
        } else if (svgRect) {
          left = svgRect.left - containerRect.left + MARGIN.left;
          top = svgRect.top - containerRect.top + MARGIN.top;
          width = Math.max(0, svgRect.width - (MARGIN.left + MARGIN.right));
          height = Math.max(0, svgRect.height - (MARGIN.top + MARGIN.bottom));
        }
      } catch {
        // Safari 등 예외 무시
      }

      setPlotRect({
        left: safeRound(left),
        top: safeRound(top),
        width: safeRound(width),
        height: safeRound(height),
      });
    };

    measure();
    rafId = requestAnimationFrame(measure);

    const mo = new MutationObserver(() => measure());
    mo.observe(root, { childList: true, subtree: true });

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

  // ───────── 플레이헤드 모션(차트 리렌더 없이) ─────────
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

  // ───────── rVFC 15Hz 업데이트 ─────────
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

  // ───────── 현재 AES 점수 ─────────
  const currentAES = useMemo(() => {
    if (!aesSeries.length || totalSec === 0) return "0.0";
    // cursorTime 기준으로 인덱스 추정 (균등 시계열 가정 없이 보수적으로)
    let lo = 0, hi = aesSeries.length - 1;
    const t = isPlaying ? sttTime : cursorTime;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((aesSeries[mid]?.tSec || 0) < t) lo = mid + 1;
      else hi = mid;
    }
    const i = Math.max(0, Math.min(aesSeries.length - 1, lo));
    return Number(aesSeries[i]?.aes || 0).toFixed(1);
  }, [aesSeries, cursorTime, sttTime, isPlaying, totalSec]);

  // ───────── 정적 차트(한 번만 그림) ─────────
  const ChartStatic = useMemo(() => {
    const Memo = React.memo(function InnerChart({ data, domain }) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={CHART_MARGIN}>
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
              formatter={(v) => [`${Number(v).toFixed(1)} 점`, "감정 점수(AES)"]}
              labelFormatter={(t) => `시간 ${fmt(Number(t))}`}
            />
            <Line
              type="linear"
              dataKey="aes"
              name="감정 점수(AES)"
              dot={false}
              isAnimationActive={false}
              stroke="#f59e0b"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    });
    return Memo;
  }, []); // 고정

  // ───────── 스크럽(클릭/드래그) ─────────
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
    // 클릭으로 점프 + 재생, 드래그 중은 일시정지 후 위치만 갱신
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const v = videoRef.current;
    wasPlayingRef.current = !!(v && !v.paused && !v.ended);
    scrubbingRef.current = false;
    startXRef.current = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  };

  const onPointerMove = (e) => {
    const nowX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? startXRef.current;
    if (!scrubbingRef.current && Math.abs(nowX - startXRef.current) > 4) {
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
      const t = clientX != null ? getTimeFromOverlay(clientX) : null;
      if (t != null) jumpTo(t, wasPlayingRef.current);
    } else {
      if (clientX != null) {
        const t = getTimeFromOverlay(clientX);
        if (t != null) jumpTo(t, true);
      }
    }
    window.removeEventListener("pointermove", onPointerMove);
  };

  // ───────── 비디오 플레이/일시정지 디바운스 ─────────
  const playPauseTimer = useRef(null);
  const setPlayingDebounced = (val) => {
    clearTimeout(playPauseTimer.current);
    playPauseTimer.current = setTimeout(() => setIsPlaying(val), 0);
  };

  // ───────── 슬라이더 변경(외부 조작) ─────────
  const handleSliderChange = (t) => {
    jumpTo(t, false);
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

      {/* 📈 감정 점수(AES) 그래프 */}
      <div className="min-w-0">
        <p className="text-base text-gray-800 font-semibold mb-2 text-center">감정 점수(AES) 변화</p>

        {/* 패딩 없는 래퍼에 차트 + 오버레이 동시 배치 */}
        <div
          ref={chartWrapRef}
          className="relative h-60 md:h-72 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
        >
          {/* 점수 뱃지 */}
          <div className="absolute top-3 right-3 z-20">
            <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-sm font-semibold shadow-sm">
              {currentAES} 점
            </span>
          </div>

          {/* 차트(정적) */}
          <div className="absolute inset-0">
            <ChartStatic data={aesSeries} domain={xDomain} />
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
              <div className="w-[2px] h-full bg-orange-500/90" />
            </motion.div>
          </div>
        </div>

        {/* 🔥 극성/히트 슬라이더 (차트와 동기화) */}
        <div className="mt-3 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-3">
            <EmotionHeatSlider
              data={emotionChartData}
              cursorTime={isPlaying ? sttTime : cursorTime}
              onChangeTime={handleSliderChange}
              bins={sliderBins}
            />
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
