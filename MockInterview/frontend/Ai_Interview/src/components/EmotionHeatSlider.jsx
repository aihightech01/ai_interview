import React, { useMemo } from "react";

// 데이터에 있는 감정 키
const EMOTIONS = ["neutral", "happy", "sad", "angry", "fear", "disgust", "surprise"];

// 감정의 극성(부정:-1 ~ 긍정:+1) — 필요 시 팀 기준으로 조정
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
  neutral:  "https://raw.githubusercontent.com/gitperson123/emoji-slider-reaction/main/slightly_smiling_face_3d.png",
  happy:    "https://github.com/gitperson123/emoji-slider-reaction/blob/main/smiling_face_with_sunglasses_3d.png?raw=true",
  surprise: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Face%20with%20open%20mouth/3D/face_with_open_mouth_3d.png?raw=true",
  sad:      "https://raw.githubusercontent.com/gitperson123/emoji-slider-reaction/main/anxious_face_with_sweat_3d.png",
  angry:    "https://raw.githubusercontent.com/gitperson123/emoji-slider-reaction/main/hot_face_3d.png",
  fear:     "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Cold%20face/3D/cold_face_3d.png?raw=true",
  disgust:  "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Nauseated%20face/3D/nauseated_face_3d.png?raw=true",
};

// cursorTime에 가장 가까운 프레임 찾기
function nearestFrame(data, t) {
  if (!data?.length) return null;
  let best = data[0], diff = Math.abs(t - data[0].t);
  for (const f of data) {
    const d = Math.abs(t - f.t);
    if (d < diff) { best = f; diff = d; }
  }
  return best;
}

// 프레임에서 확률이 가장 높은 감정 키 리턴
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
 *  - data: [{ t, neutral, happy, sad, angry, fear, disgust, surprise }, ...]  // 확률: 0~100(%)
 *  - cursorTime: number (초)    // 차트/플레이어의 현재 시간
 *  - onChangeTime?: (t:number)  // 슬라이더 클릭 시 이동할 시간 알림
 *  - bins?: number              // 클릭 구간 수(왼쪽 부정 ~ 오른쪽 긍정), 기본 7
 */
export default function EmotionHeatSlider({ data, cursorTime, onChangeTime, bins = 7 }) {
  const totalDur = data?.length ? data[data.length - 1].t : 0;

  // 현재 시점의 Top-1 감정과 그 극성
  const { topKey, valence } = useMemo(() => {
    const f = nearestFrame(data || [], cursorTime || 0);
    if (!f) return { topKey: "neutral", valence: 0 };
    const k = top1Emotion(f);
    return { topKey: k, valence: VALENCE[k] ?? 0 };
  }, [data, cursorTime]);

  // 극성(-1~+1) → 위치 0~100%
  const posPct = ((valence + 1) / 2) * 100;

  // 왼쪽(부정)~오른쪽(긍정)으로 bins개 클릭영역 생성
  const stops = useMemo(() => {
    return Array.from({ length: bins }, (_, i) => {
      const startPct = (i / bins) * 100;
      const endPct = ((i + 1) / bins) * 100;
      const midV = ((startPct + endPct) / 100) * 2 - 1; // 퍼센트 → 극성
      return { i, startPct, endPct, midV };
    });
  }, [bins]);

  // 클릭된 극성 구간과 "가장 잘 맞는" 프레임의 시간으로 점프
  const handleBinClick = (midV) => {
    if (!onChangeTime || !data?.length) return;
    let bestT = null;
    let bestScore = Infinity;

    // 각 프레임에서 Top-1 감정의 극성 사용
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

  // ✅ 쉼표 누락 수정 + 6자리 HEX로 통일
  const gradient =
    "linear-gradient(to right, #d7263d, #ff8c42, #ffd166, #fff4be, #a2e68d, #61e276, #2ef14f)";

  return (
    <div className="w-full">
      {/* 트랙 */}
      <div className="relative w-full select-none">
        <div
          className="w-full h-6 rounded-full overflow-hidden"
          style={{ backgroundImage: gradient }}
          role="presentation"
        >
          <div className="relative w-full h-full flex">
            {stops.map((s) => (
              <button
                key={s.i}
                type="button"
                className="flex-1 h-full focus:outline-none"
                onClick={() => handleBinClick(s.midV)}
                title={`${Math.round(s.startPct)}% ~ ${Math.round(s.endPct)}% polarity`}
                aria-label={`jump to polarity bin ${s.i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* 커서 이모지: 현재 Top-1 감정의 극성 위치로 이동 */}
        <div
          className="pointer-events-none absolute -top-5"
          style={{
            left: `calc(${posPct}% - 24px)`,
            transition: "left 120ms ease",
          }}
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
