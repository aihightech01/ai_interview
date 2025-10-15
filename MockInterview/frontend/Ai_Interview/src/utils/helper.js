export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const formatSec = (s=0) =>
  `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export function splitNumberedQuestions(raw) {
  if (!raw) return [];
  const s = raw.replace(/<br\s*\/?>/gi, "\n").replace(/\r\n?/g, "\n").trim();
  const re = /(?:^|\n)\s*(\d+)\s*[.)]\s*(.+?)(?=(?:\n\s*\d+\s*[.)]\s*)|$)/gs;

  const items = [];
  let m;
  while ((m = re.exec(s)) !== null) {
    const no = Number(m[1]);
    const text = m[2].replace(/^\*+\s*|\s*\*+$/g, "").trim();
    if (text) items.push({ id: no, text });
  }

  if (!items.length) {
    return s.split(/\n{2,}/).map((t, i) => ({ id: i + 1, text: t.trim() })).filter(x => x.text);
  }
  return items;
}