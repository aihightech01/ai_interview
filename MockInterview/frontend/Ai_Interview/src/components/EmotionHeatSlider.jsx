// src/pages/Reports/components/EmotionHeatSlider.jsx
import React, { useMemo, useRef } from "react";

// 데이터에 있는 감정 키
const EMOTIONS = ["neutral", "happy", "sad", "angry", "fear", "disgust", "surprise"];

// 감정의 극성(부정:-1 ~ 긍정:+1)
const VALENCE = {
  neutral: 0.0,
  happy: 1.0,
  surprise: 0.2,
  sad: -0.8,
  angry: -1.0,
  fear: -0.9,
  disgust: -0.9,
};

// 이모지 이미지(원하면 public 에셋으로 교체)
const EMOJI_SRC = {
  neutral:
    "https://raw.githubusercontent.com/gitperson123/emoji-slider-reaction/main/slightly_smiling_face_3d.png",
  happy:
    "https://github.com/gitperson123/emoji-slider-reaction/blob/main/smiling_face_with_sunglasses_3d.png?raw=true",
  surprise:
    "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Face%20with%20open%20mouth/3D/face_with_open_mouth_3d.png?raw=true",
  sad: "https://raw.githubusercontent.com/gitperson123/emoji-slider-reaction/main/anxious_face_with_sweat_3d.png",
  angry: "https://raw.githubusercontent.com/gitperson123/emoji-slider-reaction/main/hot_face_3d.png",
  fear:
    "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Cold%20face/3D/cold_face_3d.png?raw=true",
  disgust:
    "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Nauseated%20face/3D/nauseated_face_3d.png?raw=true",
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

// 프레임의 "가중 극성"(모든 감정 확률을 가중치로 사용)
function weightedValence(frame) {
  if (!frame) return 0;
  let sumW = 0;
  let sumWV = 0;
  for (const k of EMOTIONS) {
    let p = frame[k] ?? 0; // 0~100 또는 0~1 모두 대응
    if (p > 1) p = p / 100;
    sumW += p;
    sumWV += p * (VALENCE[k] ?? 0);
  }
  if (sumW <= 0) return 0;
  return sumWV / sumW; // -1 ~ +1
}

/**
 * props:
 *  - data: [{ t, neutral, happy, sad, angry, fear, disgust, surprise }, ...]  // 확률: 0~100(%)
 *  - cursorTime: number (초)
 *  - onChangeTime?: (t:number)
 *  - bins?: number
 *  - totalSec?: number                 // 시간 마커용 전체 길이(영상 duration 권장)
 *  - scrubMode?: "polarity" | "time"   // 클릭 동작 (기본 polarity)
 */
export default function EmotionHeatSlider({
  data = [],
  cursorTime = 0,
  onChangeTime,
  bins = 7,
  totalSec,
  scrubMode = "polarity",
}) {
  const totalDurData = data?.length ? data[data.length - 1].t : 0;
  const fullDur = Number.isFinite(totalSec) && totalSec > 0 ? totalSec : totalDurData;

  // 현재 시점의 Top-1 이모지 + 가중 극성
  const { topKey, wVal } = useMemo(() => {
    const f = nearestFrame(data || [], cursorTime || 0);
    if (!f) return { topKey: "neutral", wVal: 0 };
    return { topKey: top1Emotion(f), wVal: weightedValence(f) };
  }, [data, cursorTime]);

  // 가중 극성(-1~+1) → 0~100% (이모지 위치)
  const posPct = ((wVal + 1) / 2) * 100;

  // 시간 마커(%) — 시각적 동기화
  const timePct = fullDur > 0 ? Math.min(100, Math.max(0, (cursorTime / fullDur) * 100)) : 0;

  // 클릭 구간 (극성용)
  const stops = useMemo(() => {
    return Array.from({ length: bins }, (_, i) => {
      const startPct = (i / bins) * 100;
      const endPct = ((i + 1) / bins) * 100;
      const midV = ((startPct + endPct) / 100) * 2 - 1; // 퍼센트 → 극성
      return { i, startPct, endPct, midV };
    });
  }, [bins]);

  // 클릭 동작
  const trackRef = useRef(null);
  const handleTrackClick = (e) => {
    if (!onChangeTime || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;

    // scrubMode === "time": 트랙 클릭 → 시간 점프
    if (scrubMode === "time" && fullDur > 0) {
      const t = Math.max(0, Math.min(1, pct)) * fullDur;
      onChangeTime(t);
      return;
    }

    // scrubMode === "polarity": 극성 기반 최근접 시간 점프
    if (!data?.length) return;
    const midV = Math.max(-1, Math.min(1, pct * 2 - 1)); // 0~1 → -1~+1

    let bestT = null;
    let bestScore = Infinity;
    for (const f of data) {
      // 각 프레임의 "가중 극성"과 클릭 극성의 거리
      const v = weightedValence(f);
      const score = Math.abs(v - midV);
      if (score < bestScore) {
        bestScore = score;
        bestT = f.t;
      }
    }
    if (bestT != null) onChangeTime(bestT);
  };

  // ✅ 6자리 HEX로 통일 + 쉼표 정상
  const gradient =
    "linear-gradient(to right, #d7263d, #ff8c42, #ffd166, #fff4be, #a2e68d, #61e276, #2ef14f)";

  return (
    <div className="w-full">
      {/* 트랙 */}
      <div className="relative w-full select-none">
        <div
          ref={trackRef}
          className="relative w-full h-6 rounded-full overflow-hidden cursor-pointer"
          style={{ backgroundImage: gradient }}
          role="presentation"
          onClick={handleTrackClick}
        >
          {/* 극성 클릭영역 (polarity 모드일 때만 보조 버튼 생성) */}
          {scrubMode === "polarity" && (
            <div className="relative w-full h-full flex">
              {stops.map((s) => (
                <button
                  key={s.i}
                  type="button"
                  className="flex-1 h-full focus:outline-none"
                  title={`${Math.round(s.startPct)}% ~ ${Math.round(s.endPct)}% polarity`}
                  aria-label={`jump to polarity bin ${s.i + 1}`}
                />
              ))}
            </div>
          )}

          {/* ⏱️ 시간 진행 마커 */}

        </div>

        {/* 커서 이모지: "Top-1 감정 이미지" + "가중 극성 위치" */}
        <div
          className="pointer-events-none absolute -top-5"
          style={{ left: `calc(${posPct}% - 24px)`, transition: "left 120ms ease" }}
          aria-hidden
        >
          <div className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center">
            <img
              key={`${topKey}-${Math.round(posPct)}`}
              src={EMOJI_SRC[topKey]}
              alt={topKey}
              className="w-10 h-10 object-contain animate-[bounce_0.9s_ease]"
            />
          </div>
        </div>
      </div>

      {/* 라벨 */}
      <div className="mt-2 text-[10px] text-gray-500 flex justify-between">
        <span>부정</span>
        <span>긍정</span>
      </div>
    </div>
  );
}
