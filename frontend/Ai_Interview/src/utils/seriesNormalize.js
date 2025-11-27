// src/utils/seriesNormalize.js
/** 비정상 문자열 배열도 복구해서 파싱 */
export function parseLooseArray(input) {
  if (Array.isArray(input)) return input;
  if (typeof input !== "string") return [];
  let s = input.trim();
  const l = s.indexOf("[");
  const r = s.lastIndexOf("}");
  if (l !== -1 && r !== -1 && r > l) {
    s = s.slice(l, r + 1);
    s = s.replace(/,\s*$/, "");   // 꼬리 콤마 제거
    s = `${s}]`;                  // 배열 닫기
  }
  s = s.replace(/,\s*\]/g, "]");  // ',]' 정리
  try { return JSON.parse(s); } catch { return []; }
}

/** Vision: frame 기준 숫자화/정렬/중복제거 */
export function normalizeVision(raw) {
  const arr = parseLooseArray(raw)
    .map(v => ({
      frame: Number(v.frame),
      head_yaw: Number(v.head_yaw),
      head_pitch: Number(v.head_pitch),
      gaze_yaw: Number(v.gaze_yaw),
      gaze_pitch: Number(v.gaze_pitch),
    }))
    .filter(v => Number.isFinite(v.frame));
  // 같은 frame이 여러 개면 마지막 값을 채택
  const byFrame = new Map();
  for (const v of arr) byFrame.set(v.frame, v);
  return Array.from(byFrame.values()).sort((a, b) => a.frame - b.frame);
}

/** Emotion: frame_idx 기준 숫자화/정렬/중복제거 */
export function normalizeEmotion(raw) {
  const arr = parseLooseArray(raw)
    .map(e => ({
      frame_idx: Number(e.frame_idx),
      angry: Number(e.angry),
      disgust: Number(e.disgust),
      fear: Number(e.fear),
      happy: Number(e.happy),
      neutral: Number(e.neutral),
      sad: Number(e.sad),
      surprise: Number(e.surprise),
      top_label: e.top_label,
    }))
    .filter(e => Number.isFinite(e.frame_idx));
  const byIdx = new Map();
  for (const e of arr) byIdx.set(e.frame_idx, e);
  return Array.from(byIdx.values()).sort((a, b) => a.frame_idx - b.frame_idx);
}
