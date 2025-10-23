// src/pages/Reports/components/EmotionOnlySynced.jsx
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
import EmotionHeatSlider from "./EmotionHeatSlider";

/**
 * props:
 *  - emotionChartData: [{ t, neutral, happy, sad, angry, fear, disgust, surprise }, ...] // % (0~100)
 *  - videoUrl?: string
 *  - poster?: string
 */
export default function EmotionOnlySynced({
  emotionChartData = [],
  videoUrl = "",
  poster = "",
}) {
  // ── 타임라인: cursorTime(탐색/정지 기준) + uiTime(재생 중 15Hz로만 갱신)
  const [cursorTime, setCursorTime] = useState(0);
  const [uiTime, setUiTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef(null);

  // ── 차트 상태바 정렬용 bbox
  const chartWrapRef = useRef(null);
  const [plotRect, setPlotRect] = useState({ left: 0, top: 0, width: 0, height: 0 });

  // 총 길이: 영상 duration 우선
  const totalSec = useMemo(() => {
    const t = emotionChartData.at(-1)?.t || 0;
    return (duration && Number.isFinite(duration) ? duration : 0) || t || 0;
  }, [duration, emotionChartData]);

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (v) setDuration(v.duration || 0);
  };

  // ─────────────────────────────────────────────────────────
  // AES(0~100) 계산
  // ─────────────────────────────────────────────────────────
  const VALENCE_MAP = {
    angry: -0.9, disgust: -0.7, fear: -0.8, sad: -0.9,
    happy: 0.9, surprise: 0.3, neutral: 0.0,
  };
  const AROUSAL_MAP = {
    angry: 0.8, disgust: 0.4, fear: 0.9, sad: 0.2,
    happy: 0.7, surprise: 1.0, neutral: 0.1,
  };
  const LABELS = ["angry","disgust","fear","happy","sad","surprise","neutral"];
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
      V += probs[i] * (VALENCE_MAP[LABELS[i]] ?? 0);
      A += probs[i] * (AROUSAL_MAP[LABELS[i]] ?? 0.5);
    }
    const Vn = (V + 1) / 2;
    const C = 1 - (LABELS.length ? entropy(probs) / Math.log(LABELS.length) : 0);
    return clamp01(0.4 * Vn + 0.4 * clamp01(A) + 0.2 * clamp01(C));
  };

  // ── 차트용 시계열 (정적)
  const aesSeries = useMemo(() => {
    if (!emotionChartData.length) return [];
    return emotionChartData.map((row) => ({
      tSec: row.t || 0,
      aes: Math.round(computeAES01(row) * 1000) / 10, // 0~100 소수1자리
    }));
  }, [emotionChartData]);

  // 현재 점수 표기
  const currentAES = useMemo(() => {
    if (!aesSeries.length || totalSec === 0) return 0;
    const t = isPlaying ? uiTime : cursorTime;
    let lo = 0, hi = aesSeries.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((aesSeries[mid]?.tSec || 0) < t) lo = mid + 1; else hi = mid;
    }
    const i = Math.max(0, Math.min(aesSeries.length - 1, lo));
    return Number(aesSeries[i]?.aes || 0).toFixed(1);
  }, [aesSeries, cursorTime, uiTime, isPlaying, totalSec]);

  // x도메인
  const xDomain = useMemo(() => {
    const maxX = totalSec || aesSeries.at(-1)?.tSec || 0;
    return [0, Math.max(0, Number(maxX) || 0)];
  }, [totalSec, aesSeries]);

  // ── 재생 중 프레임 콜백: UI 15Hz만 setState (버벅임 방지)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let stop = false;
    let last = 0;
    const interval = 1000 / 15;

    const onFrame = () => {
      if (stop) return;
      const t = v.currentTime || 0;
      const now = performance.now();
      if (now - last >= interval) {
        setUiTime(t); // 슬라이더/상태바 동기화
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
  }, [isPlaying]);

  // ── 외부 조작(차트/슬라이더) → 비디오 이동 + uiTime도 맞춤
  const jumpTo = (t) => {
    const v = videoRef.current;
    const [x0, x1] = xDomain;
    const clamped = Math.min(x1, Math.max(x0, t));
    if (v && Math.abs((v.currentTime || 0) - clamped) > 0.01) v.currentTime = clamped;
    setCursorTime(clamped);
    setUiTime(clamped);
  };

  // 차트 클릭
  const handleChartClick = (e) => {
    if (e && typeof e.activeLabel === "number") jumpTo(e.activeLabel);
  };

  // 슬라이더 변경
  const handleSliderChange = (t) => {
    jumpTo(t);
  };

  // ── 플롯(bbox) 측정: 상태바 정확히 덮기
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

      let left = 12, top = 28;
      let width = Math.max(0, root.clientWidth - 24);
      let height = Math.max(0, root.clientHeight - 56);
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
    requestAnimationFrame(() => requestAnimationFrame(measure));
    const ro = new ResizeObserver(measure);
    ro.observe(chartWrapRef.current);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  // 상태바 x(px)
  const playheadLeftPx = useMemo(() => {
    const [x0, x1] = xDomain;
    const w = plotRect.width || 0;
    if (x1 <= x0 || w === 0) return 0;
    const t = isPlaying ? uiTime : cursorTime;
    const pct = Math.min(1, Math.max(0, (t - x0) / (x1 - x0)));
    return pct * w;
  }, [xDomain, plotRect.width, cursorTime, uiTime, isPlaying]);

  // ───────────────── UI ─────────────────
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* ◀ 영상 */}
      <div>
        <p className="text-xs text-gray-500 mb-2">실전 면접 영상</p>
        <div className="aspect-video overflow-hidden rounded-xl bg-black/90 text-white flex items-center justify-center">
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
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
          ) : (
            <span className="opacity-60 text-sm">영상 소스가 없습니다.</span>
          )}
        </div>
        <div className="mt-2 text-[11px] text-gray-500">
          {fmt(isPlaying ? uiTime : cursorTime)} / {fmt(totalSec)}
        </div>
      </div>

      {/* ▶ 감정(AES) 차트 + 상태바 + 슬라이더(무조건 포함) */}
      <div className="min-w-0">
        <div className="relative rounded-xl border border-gray-200 bg-white p-3 shadow-sm" ref={chartWrapRef}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">감정 점수 변화(AES)</p>
            <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
              {currentAES} 점
            </span>
          </div>

          {/* 상태바 오버레이 */}
          <div
            className="pointer-events-none absolute z-10"
            style={{
              left: plotRect.left,
              top: plotRect.top,
              width: plotRect.width,
              height: plotRect.height,
            }}
          >
            <div className="absolute top-0 bottom-0" style={{ left: `${playheadLeftPx}px` }}>
              <div className="w-[2px] h-full bg-orange-500/90" />
            </div>
          </div>

          {/* 정적 차트 (정말 한 번만 그리도록 메모) */}
          {useMemo(() => (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={aesSeries} onClick={handleChartClick}>
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
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [`${Number(v).toFixed(1)} 점`, "AES"]}
                    labelFormatter={(t) => `시간 ${fmt(Number(t))}`}
                  />
                  <Line
                    type="linear"
                    dataKey="aes"
                    name="AES"
                    dot={false}
                    isAnimationActive={false}
                    stroke="#f59e0b"   // 🟧 주황
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          // deps: 차트는 데이터/도메인 바뀔 때만 재생성. 시간/재생 여부 변화에는 재생성 안 함.
          // eslint-disable-next-line react-hooks/exhaustive-deps
          ), [JSON.stringify(aesSeries), xDomain[0], xDomain[1]])}

          {/* ② 극성 슬라이더: 차트와 항상 함께, 동기화 */}
          <div className="mt-3 rounded-xl border border-gray-100 bg-white p-3">
            <EmotionHeatSlider
              data={emotionChartData}
              cursorTime={isPlaying ? uiTime : cursorTime}
              onChangeTime={handleSliderChange}
              bins={7}
            />
          </div>


        </div>
      </div>
    </div>
  );
}

// 00:SS.s
function fmt(sec = 0) {
  const m = Math.floor(sec);
  const s = (sec - m).toFixed(1);
  const mm = Math.floor(m / 60);
  const ss = (m % 60) + s.slice(1);
  return `${String(mm).padStart(2, "0")}:${ss.padStart(4, "0")}`;
}
