import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

// 데이터에 있는 감정 키 (surprise 제거됨)
const EMOTIONS = ["neutral", "happy", "sad", "angry", "fear", "disgust"];

// 감정의 극성(부정:-1 ~ 긍정:+1)
const VALENCE = {
  neutral: 0.0,
  happy: 1.0,
  sad: -0.8,
  angry: -1.0,
  fear: -0.9,
  disgust: -0.9,
};

// 이모지 이미지 (surprise 제거)
const EMOJI_SRC = {
  neutral:
    "/img/Microsoft-Fluentui-Emoji-3d-Neutral-Face-3d.512.png",
  happy:
    "/img/Microsoft-Fluentui-Emoji-3d-Grinning-Face-With-Smiling-Eyes-3d.512.png",
  sad:
    "/img/Microsoft-Fluentui-Emoji-3d-Sad-But-Relieved-Face-3d.512.png",
  angry:
    "/img/Microsoft-Fluentui-Emoji-3d-Pouting-Face-3d.512.png",
  fear:
    "/img/Microsoft-Fluentui-Emoji-3d-Pensive-Face-3d.512.png",
  disgust:
    "/img/Microsoft-Fluentui-Emoji-3d-Frowning-Face-3d.512.png",
};

// cursorTime에 가장 가까운 프레임 찾기
function nearestFrame(data, t) {
  if (!data?.length) return null;
  let best = data[0],
    diff = Math.abs(t - data[0].t);
  for (const f of data) {
    const d = Math.abs(t - f.t);
    if (d < diff) {
      best = f;
      diff = d;
    }
  }
  return best;
}

// 프레임에서 확률이 가장 높은 감정 키 리턴
function top1Emotion(frame) {
  let bestKey = "neutral";
  let bestVal = -Infinity;
  for (const k of EMOTIONS) {
    const v = frame[k];
    if (v > bestVal) {
      bestVal = v;
      bestKey = k;
    }
  }
  return bestKey;
}

/**
 * props:
 *  - data: [{ t, neutral, happy, sad, angry, fear, disgust }, ...]  // 확률: 0~100(%)
 *  - cursorTime: number (초)
 *  - onChangeTime?: (t:number)
 *  - bins?: number
 *  - spring?: { stiffness?: number; damping?: number }
 */
export default function EmotionHeatSlider({
  data,
  cursorTime,
  onChangeTime,
  bins = 7,
  spring = { stiffness: 260, damping: 28 },
}) {
  const reduce = useReducedMotion();

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
      if (score < bestScore) {
        bestScore = score;
        bestT = f.t;
      }
    }
    if (bestT != null) onChangeTime(bestT);
  };

  const gradient =
    "linear-gradient(to right, #d7263d, #ff8c42, #ffd166, #fff4be, #a2e68d, #61e276, #2ef14f)";

  const cursorTransition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: spring.stiffness, damping: spring.damping };

  return (
    <motion.div
      className="w-full"
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={reduce ? {} : { opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.25, ease: "easeOut" }}
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
              : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
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
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 24 }}
          >
            <motion.img
              key={`${topKey}-${Math.round(posPct)}`}
              src={EMOJI_SRC[topKey]}
              alt={topKey}
              className="w-10 h-10 object-contain"
              initial={reduce ? false : { y: -2, opacity: 0.9 }}
              animate={reduce ? {} : { y: 0, opacity: 1 }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 22 }}
              onError={(e) => {
                e.currentTarget.src = EMOJI_SRC.neutral;
              }}
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
