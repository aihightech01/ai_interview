import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

// surprise 제거
const EMOTIONS = ["neutral", "happy", "sad", "angry", "fear", "disgust"];

const VALENCE = {
  neutral: 0.0,
  happy: 1.0,
  sad: -0.8,
  angry: -1.0,
  fear: -0.9,
  disgust: -0.9,
};

const EMOJI_SRC = {
  neutral: "/img/Microsoft-Fluentui-Emoji-3d-Neutral-Face-3d.512.png",
  happy: "/img/Microsoft-Fluentui-Emoji-3d-Grinning-Face-With-Smiling-Eyes-3d.512.png",
  sad: "/img/Microsoft-Fluentui-Emoji-3d-Sad-But-Relieved-Face-3d.512.png",
  angry: "/img/Microsoft-Fluentui-Emoji-3d-Pouting-Face-3d.512.png",
  fear: "/img/Microsoft-Fluentui-Emoji-3d-Pensive-Face-3d.512.png",
  disgust: "/img/Microsoft-Fluentui-Emoji-3d-Frowning-Face-3d.512.png",
};

function nearestFrame(data, t) {
  if (!data?.length) return null;
  let best = data[0], diff = Math.abs(t - data[0].t);
  for (const f of data) {
    const d = Math.abs(t - f.t);
    if (d < diff) { best = f; diff = d; }
  }
  return best;
}

function top1Emotion(frame) {
  let bestKey = "neutral";
  let bestVal = -Infinity;
  for (const k of EMOTIONS) {
    const v = frame[k];
    if (v > bestVal) { bestVal = v; bestKey = k; }
  }
  return bestKey;
}

/**
 * props:
 *  - data: [{ t, neutral, happy, sad, angry, fear, disgust }, ...]  // 확률: 0~100(%)
 *  - cursorTime: number (초)
 *  - onChangeTime?: (t:number)
 *  - bins?: number
 *  - spring?: { stiffness?: number; damping?: number }  // 기본 스프링 강도
 *  - tempo?: "normal" | "slow" | "fast"                 // ✅ 전체 모션 템포
 */
export default function EmotionHeatSlider({
  data,
  cursorTime,
  onChangeTime,
  bins = 7,
  spring = { stiffness: 260, damping: 28 },
  tempo = "slow", // ← 기본을 'slow'로 설정해 둠
}) {
  const reduce = useReducedMotion();

  // ✅ tempo 계수: slow->느리게, fast->빠르게
  const tempoFactor = tempo === "slow" ? 1.8 : tempo === "fast" ? 0.7 : 1.0;

  const { topKey, valence } = useMemo(() => {
    const f = nearestFrame(data || [], cursorTime || 0);
    if (!f) return { topKey: "neutral", valence: 0 };
    const k = top1Emotion(f);
    return { topKey: k, valence: VALENCE[k] ?? 0 };
  }, [data, cursorTime]);

  const posPct = ((valence + 1) / 2) * 100;

  const stops = useMemo(() => {
    return Array.from({ length: bins }, (_, i) => {
      const startPct = (i / bins) * 100;
      const endPct = ((i + 1) / bins) * 100;
      const midV = ((startPct + endPct) / 100) * 2 - 1;
      return { i, startPct, endPct, midV };
    });
  }, [bins]);

  const handleBinClick = (midV) => {
    if (!onChangeTime || !data?.length) return;
    let bestT = null;
    let bestScore = Infinity;

    for (const f of data) {
      const k = top1Emotion(f);
      const v = VALENCE[k] ?? 0;
      const score = Math.abs(v - midV);
      if (score < bestScore) { bestScore = score; bestT = f.t; }
    }
    if (bestT != null) onChangeTime(bestT);
  };

  const gradient =
    "linear-gradient(to right, #d7263d, #ff8c42, #ffd166, #fff4be, #a2e68d, #61e276, #2ef14f)";

  // ✅ cursor(이모지 버블) 이동 스프링: stiffness ↓, damping ↑, 전체 느리게
  const cursorTransition = reduce
    ? { duration: 0 }
    : {
        type: "spring",
        stiffness: Math.max(60, spring.stiffness / tempoFactor), // 느리면 강도 낮춤
        damping: spring.damping * tempoFactor,                    // 느리면 감쇠 늘림
        mass: 1.0,
      };

  // ✅ 등장/페이드, 트랙 브라이트니스 루프도 템포 반영(길게)
  const fadeDuration = reduce ? 0 : 0.25 * tempoFactor;
  const pulseDuration = reduce ? 0 : 2.4 * tempoFactor;

  // ✅ 이모지 교체 애니메이션도 살짝 느리게
  const bubbleSpring = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 220 / tempoFactor, damping: 24 * tempoFactor };
  const emojiSpring = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 260 / tempoFactor, damping: 26 * tempoFactor };

  return (
    <motion.div
      className="w-full"
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={reduce ? {} : { opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: fadeDuration, ease: "easeOut" }}
    >
      <div className="relative w-full select-none">
        {/* 트랙 */}
        <motion.div
          className="w-full h-6 rounded-full overflow-hidden shadow-inner"
          style={{ backgroundImage: gradient }}
          role="presentation"
          animate={
            reduce ? {} : { filter: ["brightness(1)", "brightness(1.03)", "brightness(1)"] }
          }
          transition={
            reduce
              ? { duration: 0 }
              : { duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }
          }
        >
          <div className="relative w-full h-full flex">
            {stops.map((s) => (
              <motion.button
                key={s.i}
                type="button"
                className="flex-1 h-full focus:outline-none"
                onClick={() => handleBinClick(s.midV)}
                whileHover={reduce ? {} : { opacity: 0.9, scaleY: 1.02 }}
                whileTap={reduce ? {} : { scaleY: 0.98 }}
                style={{ WebkitTapHighlightColor: "transparent" }}
              />
            ))}
          </div>
        </motion.div>

        {/* 커서 이모지 */}
        <motion.div
          className="pointer-events-none absolute -top-5"
          animate={{ left: `calc(${posPct}% - 24px)` }}
          transition={cursorTransition}
          layout
        >
          <motion.div
            className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center"
            initial={reduce ? false : { scale: 0.9, opacity: 0 }}
            animate={reduce ? {} : { scale: 1, opacity: 1 }}
            transition={bubbleSpring}
          >
            <motion.img
              key={`${topKey}-${Math.round(posPct)}`}
              src={EMOJI_SRC[topKey]}
              alt={topKey}
              className="w-10 h-10 object-contain"
              initial={reduce ? false : { y: -2, opacity: 0.9 }}
              animate={reduce ? {} : { y: 0, opacity: 1 }}
              transition={emojiSpring}
              onError={(e) => { e.currentTarget.src = EMOJI_SRC.neutral; }}
            />
          </motion.div>
        </motion.div>
      </div>

      <div className="mt-2 text-[10px] text-gray-500 flex justify-between">
        <span>부정</span>
        <span>긍정</span>
      </div>
    </motion.div>
  );
}
