// src/components/SttSynced.jsx
import React, { useEffect, useMemo, useRef } from "react";

/**
 * STT 세그먼트 뷰어 (현재 시간과 동기화)
 *
 * Props
 * - currentTime: number                 // 현재 재생 시각(초)
 * - segments: Array<Segment | string>   // [{ start, end, text, tokens? }, ...] 또는 JSON 문자열
 * - timeUnit: 's' | 'ms'                // 입력 단위 (기본: 's')
 * - shaveStartSec: number               // 시작점 미세조정
 * - shaveEndSec: number                 // 끝점 미세조정
 * - epsSec: number                      // 포함 판정 여유값
 * - totalSec: number | Infinity         // 전체 길이 클램프
 * - title: string
 * - maxHeight: string                   // Tailwind 값
 * - itemClassName: string
 * - tokenHighlight: boolean             // tokens 있을 때 단어 단위 하이라이트
 * - approxWhenNoTokens: boolean         // tokens 없으면 대략적 분할 강조
 * - smoothScroll: boolean               // 활성 문장 자동 스크롤
 * - debug: boolean                      // 콘솔 디버그
 * - onDebug?: (eventName, payload) => void
 */

export default function SttSynced({
  currentTime = 0,
  segments = [],
  timeUnit = "s",
  shaveStartSec = 0,
  shaveEndSec = 0.06,
  epsSec = 0.08,
  totalSec = Infinity,
  title = "STT",
  maxHeight = "max-h-48",
  itemClassName = "",
  tokenHighlight = false,
  approxWhenNoTokens = true,
  smoothScroll = true,
  debug = false,
  onDebug,
}) {
  const wrapRef = useRef(null);
  const activeLineRef = useRef(null);
  const prevActiveIdxRef = useRef(-1);

  // 로깅
  const log = (evt, payload) => {
    if (onDebug) onDebug(evt, payload);
    if (debug) console.debug(`[SttSynced:${evt}]`, payload);
  };
  const warn = (evt, payload) => {
    if (onDebug) onDebug(evt, payload);
    if (debug) console.warn(`[SttSynced:${evt}]`, payload);
  };

  // 입력 정규화 (문자열 JSON 허용, ms→s 변환)
  const normalized = useMemo(() => {
    try {
      const raw = typeof segments === "string" ? JSON.parse(segments) : segments;
      const arr = Array.isArray(raw) ? raw : [];
      if (!arr.length) {
        warn("empty-segments", { length: 0 });
        return [];
      }

      const toSec = (v) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return NaN;
        return timeUnit === "ms" ? n / 1000 : n;
      };

      const out = arr
        .map((s, i) => {
          const start = toSec(s.start);
          const end = toSec(s.end);
          const text = String(s.text ?? "");
          const tokens = Array.isArray(s.tokens)
            ? s.tokens.map((t) => ({
                start: toSec(t.start),
                end: toSec(t.end),
                text: String(t.text ?? ""),
              }))
            : null;

          return { i, start, end, text, tokens };
        })
        .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.text.length > 0)
        .map((s) => ({
          ...s,
          start: Math.max(0, Math.min(totalSec, s.start + shaveStartSec)),
          end: Math.max(0, Math.min(totalSec, s.end - shaveEndSec)),
        }))
        .sort((a, b) => a.start - b.start);

      if (!out.length) {
        warn("no-valid-segments", { afterNormalize: 0 });
      } else {
        log("normalized", {
          count: out.length,
          first: { start: out[0].start, end: out[0].end, text: out[0].text.slice(0, 30) },
          last: {
            start: out.at(-1).start,
            end: out.at(-1).end,
            text: out.at(-1).text.slice(0, 30),
          },
        });
      }
      return out;
    } catch (e) {
      warn("parse-error", { error: String(e) });
      return [];
    }
  }, [segments, timeUnit, shaveStartSec, shaveEndSec, totalSec]);

  // 활성 문장/토큰 인덱스
  const { activeIdx, activeTokenIdx } = useMemo(() => {
    if (!normalized.length) return { activeIdx: -1, activeTokenIdx: -1 };
    const t = currentTime;

    let idx = normalized.findIndex((seg) => t + epsSec >= seg.start && t <= seg.end + epsSec);
    if (idx < 0) {
      if (t < normalized[0].start) idx = 0;
      else if (t > normalized.at(-1).end) idx = normalized.length - 1;
    }

    let tokenIdx = -1;
    if (idx >= 0 && tokenHighlight) {
      const seg = normalized[idx];
      if (seg.tokens && seg.tokens.length) {
        tokenIdx = seg.tokens.findIndex((tk) => t + epsSec >= tk.start && t <= tk.end + epsSec);
        if (tokenIdx < 0) {
          const last = seg.tokens.at(-1);
          if (t < seg.tokens[0].start) tokenIdx = 0;
          else if (last && t > last.end) tokenIdx = seg.tokens.length - 1;
        }
      }
    }
    return { activeIdx: idx, activeTokenIdx: tokenIdx };
  }, [normalized, currentTime, epsSec, tokenHighlight]);

  // 활성 문장 자동 스크롤 (변경될 때만)
  useEffect(() => {
    if (!smoothScroll) return;
    if (activeIdx < 0) return;

    if (prevActiveIdxRef.current !== activeIdx) {
      prevActiveIdxRef.current = activeIdx;
      const el = activeLineRef.current;
      if (el && el.scrollIntoView) {
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [activeIdx, smoothScroll]);

  // 못 찾았을 때 경고
  useEffect(() => {
    if (!debug) return;
    if (!normalized.length) return;
    if (activeIdx < 0) {
      warn("no-active-segment", {
        currentTime,
        firstStart: normalized[0].start,
        lastEnd: normalized.at(-1).end,
      });
    }
  }, [activeIdx, normalized, currentTime, debug]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <p className="text-base text-gray-800 font-semibold">{title}</p>
        <span className="text-xs text-gray-400">
          {normalized.length ? `${normalized.length} 문장` : "세그먼트 없음"}
        </span>
      </div>

      <div
        ref={wrapRef}
        className={`rounded-xl border border-gray-200 bg-white/80 p-3 overflow-y-auto ${maxHeight}`}
      >
        {!normalized.length && (
          <div className="text-xs text-gray-500">
            표시할 STT 세그먼트가 없습니다. (콘솔의 [SttSynced:*] 로그를 확인하세요)
          </div>
        )}

        {normalized.map((seg, i) => {
          const isActive = i === activeIdx;
          const baseCls =
            "px-2 py-1.5 rounded-lg text-sm leading-6 transition-colors duration-150";
          const cls = isActive
            ? `${baseCls} bg-blue-50 text-blue-800 border border-blue-200`
            : `${baseCls} text-gray-700 hover:bg-gray-50`;

          return (
            <div
              key={i}
              className={`mb-1 ${cls}`}
              ref={isActive ? activeLineRef : null}
              data-start={seg.start}
              data-end={seg.end}
              title={`${seg.start.toFixed(2)}s ~ ${seg.end.toFixed(2)}s`}
            >
              <span className="mr-2 inline-block text-[11px] text-gray-400 align-middle">
                [{formatTime(seg.start)}]
              </span>

              {tokenHighlight && seg.tokens?.length ? (
                <TokenLine seg={seg} activeTokenIdx={activeTokenIdx} />
              ) : approxWhenNoTokens ? (
                <ApproxText seg={seg} t={currentTime} />
              ) : (
                <span className="align-middle">{seg.text}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 00:07.5 */
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(1);
  const mm = String(m).padStart(2, "0");
  const ss =
    String(Math.floor(Number(s))).padStart(2, "0") + (s.includes(".") ? s.slice(-2) : ".0");
  return `${mm}:${ss}`;
}

function TokenLine({ seg, activeTokenIdx }) {
  return (
    <span className="align-middle">
      {seg.tokens.map((tk, k) => {
        const active = k === activeTokenIdx;
        return (
          <span
            key={k}
            className={active ? "bg-yellow-200 rounded px-0.5" : ""}
            data-start={tk.start}
            data-end={tk.end}
          >
            {tk.text}
            {k < seg.tokens.length - 1 ? " " : ""}
          </span>
        );
      })}
    </span>
  );
}

function ApproxText({ seg, t }) {
  const len = seg.text.length;
  if (len < 2) return <span className="align-middle">{seg.text}</span>;

  const ratio = clamp01((t - seg.start) / Math.max(0.0001, seg.end - seg.start));
  const idx = Math.floor(ratio * len);
  const a = seg.text.slice(0, idx);
  const b = seg.text.slice(idx, idx + 1);
  const c = seg.text.slice(idx + 1);

  return (
    <span className="align-middle">
      <span>{a}</span>
      <span className="bg-yellow-200 rounded px-0.5">{b}</span>
      <span>{c}</span>
    </span>
  );
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
