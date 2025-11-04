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
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import EmotionHeatSlider from "./EmotionHeatSlider";
import SttSynced from "../components/SttSynced";

/** mm:ss.s */
function fmt(sec = 0) {
  const mm = Math.floor(sec / 60);
  const ss = (sec - mm * 60).toFixed(1);
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(4, "0")}`;
}

/** 감정 팔레트 */
const EMO_COLOR = {
  happy: { bg: "#FEF3C7", fg: "#B45309" },
  angry: { bg: "#FEE2E2", fg: "#B91C1C" },
  sad: { bg: "#DBEAFE", fg: "#1D4ED8" },
  fear: { bg: "#EDE9FE", fg: "#6D28D9" },
  disgust: { bg: "#DCFCE7", fg: "#15803D" },
  surprise: { bg: "#CFFAFE", fg: "#0E7490" },
  neutral: { bg: "#E5E7EB", fg: "#374151" },
};

const LABELS = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"];

/** AES 계산 보조 */
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const pctToProb = (v) => clamp01((v || 0) / 100);
const normalize = (arr) => {
  const s = arr.reduce((a, b) => a + b, 0);
  if (!isFinite(s) || s <= 0) return arr.map(() => 0);
  return arr.map((v) => v / s);
};
const entropy = (probs) => {
  const eps = 1e-12;
  let H = 0;
  for (const p of probs) {
    const pp = Math.max(p, eps);
    H += -pp * Math.log(pp);
  }
  return H;
};

const VALENCE_MAP = {
  angry: -0.9,
  disgust: -0.7,
  fear: -0.8,
  sad: -0.9,
  happy: 0.9,
  surprise: 0.3,
  neutral: 0.0,
};
const AROUSAL_MAP = {
  angry: 0.8,
  disgust: 0.4,
  fear: 0.9,
  sad: 0.2,
  happy: 0.7,
  surprise: 1.0,
  neutral: 0.1,
};

/** 입력 유연화: 배열/객체 모두 rows 추출 */
function resolveEmotionRows(input) {
  if (Array.isArray(input)) return input;
  if (input && typeof input === "object") {
    if (Array.isArray(input.results)) return input.results;
    if (Array.isArray(input.frames)) return input.frames;
    if (Array.isArray(input.time_series)) return input.time_series;
    if (Array.isArray(input.data)) return input.data;
  }
  return [];
}

/** ✅ 안전 어댑터: 객체/배열 모두 처리 + 0~1 스케일 자동 업스케일 */
const toEmotionData = (input, fps = 30) => {
  const rows = resolveEmotionRows(input);
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => {
    const t = r.t != null ? Number(r.t) : Number(r.frame_idx ?? 0) / fps;

    const raw = {
      neutral: Number(r.neutral ?? 0),
      happy: Number(r.happy ?? 0),
      sad: Number(r.sad ?? 0),
      angry: Number(r.angry ?? 0),
      fear: Number(r.fear ?? 0),
      disgust: Number(r.disgust ?? 0),
      surprise: Number(r.surprise ?? 0),
    };
    const vals = Object.values(raw);
    const needsUpscale = vals.length > 0 && vals.every((v) => Number.isFinite(v) && v <= 1);
    const scale = needsUpscale ? 100 : 1;

    return {
      t,
      neutral: raw.neutral * scale,
      happy: raw.happy * scale,
      sad: raw.sad * scale,
      angry: raw.angry * scale,
      fear: raw.fear * scale,
      disgust: raw.disgust * scale,
      surprise: raw.surprise * scale,
      score: Number.isFinite(Number(r.score)) ? Number(r.score) : null, // 옵션
    };
  });
};

export default function EmotionOnlySynced({
  emotionChartData = [],     // 배열 또는 { average_score, results } 등 객체 모두 허용
  videoUrl = "",
  poster = "",
  sttSegments = [],
  sttTimeUnit = "s",
}) {
  // ✅ 1회 어댑팅
  const emotionData = useMemo(() => toEmotionData(emotionChartData, 30), [emotionChartData]);

  // 타임라인 상태
  const [cursorTime, setCursorTime] = useState(0);
  const [sttTime, setSttTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef(null);

  // 차트 bbox 계산용
  const chartWrapRef = useRef(null);
  const overlayRef = useRef(null);
  const [plotRect, setPlotRect] = useState({ left: 0, top: 0, width: 0, height: 0 });

  // 총 길이
  const totalSec = useMemo(() => {
    const t = emotionData.at(-1)?.t || 0;
    return (duration && Number.isFinite(duration) ? duration : 0) || t || 0;
  }, [duration, emotionData]);

  const xDomain = useMemo(() => {
    const maxX = totalSec || (emotionData.at(-1)?.t ?? 0);
    return [0, Math.max(0, Number(maxX) || 0)];
  }, [totalSec, emotionData]);

  const MARGIN = { top: 20, right: 16, bottom: 22, left: 36 };
  const CHART_MARGIN = { top: 60, right: 40, bottom: 5, left: 0 };

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (v) setDuration(v.duration || 0);
  };

  /** bbox 측정 */
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
        root.querySelector(".recharts-cartesian-grid") || root.querySelector(".recharts-surface");

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
          left = svgRect.left - containerRect.left + bb.x;
          top = svgRect.top - containerRect.top + bb.y;
          width = bb.width;
          height = bb.height;
        } else if (svgRect) {
          left = svgRect.left - containerRect.left + MARGIN.left;
          top = svgRect.top - containerRect.top + MARGIN.top;
          width = Math.max(0, svgRect.width - (MARGIN.left + MARGIN.right));
          height = Math.max(0, svgRect.height - (MARGIN.top + MARGIN.bottom));
        }
      } catch { }

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

  /** rVFC 15Hz + 스프링 플레이헤드 */
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
        if (p && typeof p.catch === "function") p.catch(() => { });
      }
    }
    setCursorTime(clamped);
    setSttTime(clamped);
    setPctFromTime(clamped);
  };

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
    return () => {
      stop = true;
    };
  }, [isPlaying, totalSec]);

  // 비디오 이벤트(디바운스)
  const playPauseTimer = useRef(null);
  const setPlayingDebounced = (val) => {
    clearTimeout(playPauseTimer.current);
    playPauseTimer.current = setTimeout(() => setIsPlaying(val), 0);
  };

  /** AES 시계열 + 현재 지배 감정 */
  const aesSeries = useMemo(() => {
    if (!emotionData.length) return [];
    return emotionData.map((row) => {
      const probs = normalize(LABELS.map((lb) => pctToProb(row?.[lb])));
      let V = 0,
        A = 0;
      for (let i = 0; i < LABELS.length; i++) {
        const lb = LABELS[i];
        V += probs[i] * (VALENCE_MAP[lb] ?? 0);
        A += probs[i] * (AROUSAL_MAP[lb] ?? 0.5);
      }
      const Vn = (V + 1) / 2;
      const C = 1 - (LABELS.length ? entropy(probs) / Math.log(LABELS.length) : 0);
      const aes01 = clamp01(0.4 * Vn + 0.4 * clamp01(A) + 0.2 * clamp01(C));

      // 지배 감정
      let maxIdx = 0;
      for (let i = 1; i < probs.length; i++) {
        if (probs[i] > probs[maxIdx]) maxIdx = i;
      }
      const domEmotion = LABELS[maxIdx] || "neutral";

      return {
        tSec: row.t || 0,
        aes: Math.round(aes01 * 1000) / 10,
        domEmotion,
        rawScore: Number.isFinite(row?.score) ? row.score : null, // 선택
      };
    });
  }, [emotionData]);

  const hasRawScore = useMemo(
    () => aesSeries.some((d) => Number.isFinite(d.rawScore)),
    [aesSeries]
  );

  const currentPoint = useMemo(() => {
    if (!aesSeries.length || totalSec === 0) return { aes: 0, domEmotion: "neutral" };
    const t = isPlaying ? sttTime : cursorTime;
    let lo = 0,
      hi = aesSeries.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((aesSeries[mid]?.tSec || 0) < t) lo = mid + 1;
      else hi = mid;
    }
    const i = Math.max(0, Math.min(aesSeries.length - 1, lo));
    return {
      aes: Number(aesSeries[i]?.aes || 0),
      domEmotion: aesSeries[i]?.domEmotion || "neutral",
    };
  }, [aesSeries, cursorTime, sttTime, isPlaying, totalSec]);

  const emotionColor = EMO_COLOR[currentPoint.domEmotion] ?? EMO_COLOR.neutral;

  /** 정적 차트 */
  const ChartStatic = useMemo(() => {
    const Memo = React.memo(function InnerChart({ data, domain, showRaw }) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 60, right: 40, bottom: 5, left: 0 }}>
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
              formatter={(v, n, p) => {
                const i = p?.payload;
                const emo = i?.domEmotion || "neutral";
                return [`${Number(v).toFixed(1)} 점`, n === "AES" ? `AES · ${emo}` : "원본 점수"];
              }}
              labelFormatter={(t) => `시간 ${fmt(Number(t))}`}
            />
            <Line
              type="basis"
              dataKey="aes"
              name="AES"
              dot={false}
              isAnimationActive={false}
              stroke="#f59e0b"
              strokeWidth={3.0}
            />
         
          </LineChart>
        </ResponsiveContainer>
      );
    });
    return Memo;
  }, []);

  /** 스크럽 */
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
          {fmt(isPlaying ? sttTime : cursorTime)} / {fmt(totalSec)}
        </div>
      </div>

      {/* 📊 감정(AES) 그래프 */}
      <div className="min-w-0">
        <p className="text-base text-gray-800 font-semibold mb-2 text-center">감정 점수 변화(AES)</p>

        <div
          ref={chartWrapRef}
          className="relative h-60 md:h-72 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
        >
          {/* 점수 뱃지 */}
          <div className="absolute top-3 right-3 z-20">
            <span
              className="px-3 py-1 rounded-full text-sm font-semibold shadow-sm"
              style={{ backgroundColor: emotionColor.bg, color: emotionColor.fg }}
            >
              {currentPoint.aes.toFixed(1)} 점 · {currentPoint.domEmotion}
            </span>
          </div>

          {/* 차트 */}
          <div className="absolute inset-0">
            <ChartStatic data={aesSeries} domain={xDomain} showRaw={hasRawScore} />
          </div>

          {/* ▶ 상태바/입력 오버레이 */}
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
              <div
                className="w-[2px] h-full"
                style={{ backgroundColor: emotionColor.fg, opacity: 0.9 }}
              />
            </motion.div>
          </div>
        </div>

        {/* 감정 히트 슬라이더 */}
        <div className="mt-3 rounded-2xl border border-gray-200 bg-white shadow-sm p-3">
          <EmotionHeatSlider
            data={emotionData}
            cursorTime={isPlaying ? sttTime : cursorTime}
            onChangeTime={(t) => jumpTo(t, false)}
            bins={7}
          />
        </div>
      </div>

      {/* 🗣️ STT */}
      <div className="min-w-0 md:col-span-2">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-3 pt-3">
            <div
              className="h-1 rounded-full mb-2"
              style={{ backgroundColor: emotionColor.fg, opacity: 0.8 }}
              aria-hidden
            />
          </div>
          <div className="p-3">
            <SttSynced
              currentTime={isPlaying ? sttTime : cursorTime}
              segments={sttSegments}
              timeUnit={sttTimeUnit}
              maxHeight="max-h-60"
              tokenHighlight
              approxWhenNoTokens
              smoothScroll
              debug={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
