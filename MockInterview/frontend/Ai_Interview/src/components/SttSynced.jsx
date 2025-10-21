import React, { useEffect, useMemo, useRef } from "react";

/**
 * segments 아이템 포맷(둘 중 하나):
 * 1) 문장/구 단위만 있는 경우
 *    { start, end, text }
 *    → tokens 없으면 내부에서 단어를 균등 분할(approx)
 *
 * 2) 토큰(단어) 단위 타임스탬프가 있는 경우
 *    { start, end, text, tokens: [{ start, end, text }, ...] }
 *    → tokens 기준으로 정확히 하이라이트
 */
export default function SttSynced({
  currentTime = 0,
  segments = [],
  fallback = "-",
  timeUnit = "s",            // 's' | 'ms'
  shaveStartSec = 0,
  shaveEndSec = 0.06,         // 끝점 살짝 줄이기(겹침 방지)
  epsSec = 0.08,              // 포함 판정 여유
  totalSec = Infinity,
  title = "STT",
  maxHeight = "max-h-48",
  itemClassName = "",
  highlightClassName = "",
  // 새 옵션들
  tokenHighlight = true,      // true면 토큰(단어) 단위 하이라이트
  approxWhenNoTokens = true,  // tokens 없으면 균등 분할
  smoothScroll = true,        // 활성 라인 자동 스크롤
}) {
  const toSec = (v) => {
    const n = Number(v || 0);
    return timeUnit === "ms" ? n / 1000 : n;
  };

  // 1) 구간 정규화
  const normalized = useMemo(() => {
    if (!Array.isArray(segments) || segments.length === 0) return [];

    const base = [...segments]
      .map((s) => ({
        start: toSec(s.start),
        end: s.end != null ? toSec(s.end) : null,
        text: String(s.text ?? ""),
        tokens: Array.isArray(s.tokens)
          ? s.tokens.map((tk) => ({
              start: toSec(tk.start),
              end: toSec(tk.end),
              text: String(tk.text ?? ""),
            }))
          : null,
      }))
      .sort((a, b) => a.start - b.start);

    const tiny = 1e-6;
    const out = base.map((s, i) => {
      const nextStart = i < base.length - 1 ? base[i + 1].start : Number.POSITIVE_INFINITY;

      let start = s.start + shaveStartSec;
      let end = (s.end ?? nextStart) - shaveEndSec;
      end = Math.min(end, nextStart - tiny);
      if (!Number.isFinite(end) || end < start) end = start + tiny;

      const lo = 0;
      const hi = Number.isFinite(totalSec) ? Math.max(totalSec, 0) : Number.POSITIVE_INFINITY;
      start = Math.max(lo, Math.min(hi, start));
      end = Math.max(lo, Math.min(hi, end));

      return { ...s, start, end };
    });

    return out;
  }, [segments, timeUnit, shaveStartSec, shaveEndSec, totalSec]);

  // 2) 라인(세그먼트) 활성 인덱스
  const activeIdx = useMemo(() => {
    if (!normalized.length) return -1;
    const t = Number(currentTime) || 0;
    const e = Math.max(0, epsSec);
    return normalized.findIndex((seg) => seg.start - e <= t && t < seg.end + e);
  }, [normalized, currentTime, epsSec]);

  // 3) 라인 자동 스크롤
  const activeRef = useRef(null);
  useEffect(() => {
    if (smoothScroll && activeRef.current) {
      activeRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [activeIdx, smoothScroll]);

  // 4) 토큰(단어) 준비: tokens가 있으면 그대로, 없으면 균등 분할
  const withTokens = useMemo(() => {
    if (!tokenHighlight) return normalized.map((s) => ({ ...s, _tokens: null }));

    return normalized.map((s) => {
      if (Array.isArray(s.tokens) && s.tokens.length > 0) {
        // 정확 타임스탬프 기반 토큰
        return { ...s, _tokens: s.tokens };
      }
      if (!approxWhenNoTokens) {
        return { ...s, _tokens: null };
      }
      // 균등 분할(대략): 공백 포함 분리(원문 간격 유지)
      const parts = s.text.split(/(\s+)/);
      const wordsOnly = parts.filter((w) => w.trim().length > 0);
      const duration = Math.max(s.end - s.start, 1e-6);

      let cursor = s.start;
      const share = duration / Math.max(wordsOnly.length, 1);

      const tokenized = parts.map((w) => {
        if (w.trim().length === 0) {
          // 공백 토큰: 폭 없는 토큰으로 두고 text만 유지
          return { start: cursor, end: cursor, text: w };
        } else {
          const tStart = cursor;
          const tEnd = Math.min(s.end, cursor + share);
          cursor = tEnd;
          return { start: tStart, end: tEnd, text: w };
        }
      });

      return { ...s, _tokens: tokenized };
    });
  }, [normalized, tokenHighlight, approxWhenNoTokens]);

  const isActiveAt = (t, start, end, e) => start - e <= t && t < end + e;

  // 렌더
  if (normalized.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 leading-relaxed text-slate-700 whitespace-pre-line">
        <p className="text-sm font-semibold text-gray-700 mb-1">{title}</p>
        <p>{fallback ?? "-"}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 leading-relaxed text-slate-700">
      <p className="text-sm font-semibold text-gray-700 mb-2">{title}</p>
      <div className={`${maxHeight} overflow-y-auto pr-1 space-y-1`}>
        {withTokens.map((seg, i) => {
          const t = Number(currentTime) || 0;
          const e = Math.max(0, epsSec);
          const lineActive = isActiveAt(t, seg.start, seg.end, e);

          const baseCls = "py-1 px-2 rounded-md whitespace-pre-wrap transition-colors";
          const normal = `text-slate-700 ${itemClassName}`;
          const hl = `bg-amber-100/80 ${highlightClassName}`;

          return (
            <div
              key={`${seg.start}-${i}`}
              ref={lineActive ? activeRef : null}
              className={`${baseCls} ${lineActive ? hl : normal}`}
              data-start={seg.start}
              data-end={seg.end}
            >
              {tokenHighlight && Array.isArray(seg._tokens) ? (
                seg._tokens.map((tk, j) => {
                  const tkActive = isActiveAt(t, tk.start, tk.end, e);
                  // 공백 토큰은 원래 간격 보존
                  if (tk.text.trim().length === 0) {
                    return <span key={j}>{tk.text}</span>;
                  }
                  return (
                    <span
                      key={j}
                      className={tkActive ? "text-blue-600 font-semibold" : "text-slate-700"}
                      style={{ transition: "color 160ms linear" }}
                      data-tstart={tk.start}
                      data-tend={tk.end}
                    >
                      {tk.text}
                    </span>
                  );
                })
              ) : (
                <>{seg.text}</>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
