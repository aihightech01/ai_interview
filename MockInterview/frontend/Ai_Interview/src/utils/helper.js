export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const formatSec = (s = 0) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export function splitNumberedQuestions(raw) {
  if (!raw) return [];

  const isSeparator = (t) =>
    !t ||                             // 빈 값
    /^[-–—•·\s]+$/.test(t) ||         // 하이픈/대시/점만
    /^-{2,}$/.test(t) ||              // --- 또는 ----
    /^—{2,}$/.test(t);                // em-dash 반복

  const s = raw.replace(/<br\s*\/?>/gi, "\n").replace(/\r\n?/g, "\n").trim();
  const re = /(?:^|\n)\s*(\d+)\s*[.)]\s*(.+?)(?=(?:\n\s*\d+\s*[.)]\s*)|$)/gs;

  const items = [];
  let m;
  while ((m = re.exec(s)) !== null) {
    const no = Number(m[1]);
    const text = m[2].replace(/^\*+\s*|\s*\*+$/g, "").trim();
    if (text && !isSeparator(text)) items.push({ id: no, text });
  }

  if (!items.length) {
    return s
      .split(/\n{2,}/)
      .map((t, i) => ({ id: i + 1, text: t.trim() }))
      .filter((x) => x.text && !isSeparator(x.text));
  }
  return items;
}

function cleanQuestionText(raw = "") {
  const t = String(raw)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\r\n?/g, "\n")
    .replace(/^\s*\d+\s*[.)-]\s*/, "") // 1. / 2) / 3- 제거
    .trim();

  // 구분선/빈 줄/숫자 토큰만 있는 줄 제거
  if (
    !t ||
    /^[-–—•·\s]+$/.test(t) ||
    /^-{2,}$/.test(t) ||
    /^—{2,}$/.test(t) ||
    /^\d+\s*[.)-]?$/.test(t)
  ) {
    return "";
  }
  return t;
}

// 백엔드가 숫자/소문자/다른 라벨을 주는 경우를 통일
function mapSource(src) {
  const s = String(src ?? "").toUpperCase();
  if (s === "1" || s.includes("COMMON")) return "COMMON";
  if (s === "2" || s.includes("RESUME") || s.includes("COVER")) return "RESUME";
  if (s.includes("CUSTOM")) return "CUSTOM";
  // 기본값은 COMMON
  return "COMMON";
}