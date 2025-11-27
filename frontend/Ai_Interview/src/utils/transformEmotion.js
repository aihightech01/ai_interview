// src/utils/transformEmotion.js
export function parseEmotion(raw) {
  try {
    if (!raw) return [];
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return [];
  }
}

/** emotion 배열을 차트용으로 변환
 *  - fps로 시간을 만듭니다. (기본 30fps → t = frame_idx / 30)
 *  - 값은 그대로 % 스케일을 유지
 */
export function toEmotionChartData(emotions, fps = 30) {
  if (!Array.isArray(emotions)) return [];
  const f = Math.max(1, Number(fps) || 30);
  return emotions.map((e) => ({
    t: Number(e.frame_idx) / f,
    angry: Number(e.angry),
    disgust: Number(e.disgust),
    fear: Number(e.fear),
    happy: Number(e.happy),
    neutral: Number(e.neutral),
    sad: Number(e.sad),
    surprise: Number(e.surprise),
  }));
}
