// src/utils/provisionalCount.js

const PROV_Q_KEY = "ai-coach:provisional-question-counts";
const PROV_TTL_MS = 6 * 60 * 60 * 1000; // 6시간 후 자동 무효

// TTL 정리 + 전체 읽기
export function getProvisionalCounts() {
  try {
    const raw = localStorage.getItem(PROV_Q_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    let changed = false;
    for (const k of Object.keys(obj)) {
      if (!obj[k]?.ts || now - obj[k].ts > PROV_TTL_MS) {
        delete obj[k];
        changed = true;
      }
    }
    if (changed) localStorage.setItem(PROV_Q_KEY, JSON.stringify(obj));
    return obj;
  } catch {
    return {};
  }
}

// 특정 인터뷰 ID로 조회
export function getProvisionalCountFor(interviewId) {
  const obj = getProvisionalCounts();
  return obj?.[String(interviewId)]?.count ?? null;
}

// 새 임시값 저장 (예: 업로드 200 OK 시점)
export function setProvisionalCount(interviewId, count) {
  try {
    const obj = getProvisionalCounts();
    obj[String(interviewId)] = { count: Number(count) || 0, ts: Date.now() };
    localStorage.setItem(PROV_Q_KEY, JSON.stringify(obj));
  } catch {}
}
