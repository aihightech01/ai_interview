import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Brush,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { motion } from "framer-motion";

const SEC = 1000;

function buildDummyTranscript() {
  const lines = [
    { start: 0 * SEC, end: 7 * SEC, text: "안녕하세요, 자기소개를 시작하겠습니다." },
    { start: 7 * SEC, end: 18 * SEC, text: "저는 프론트엔드 개발을 공부하며 사용자 경험에 관심이 많습니다." },
    { start: 18 * SEC, end: 30 * SEC, text: "이번 프로젝트에서는 시선·감정·발화 강도를 통합해 시각화했습니다." },
    { start: 30 * SEC, end: 45 * SEC, text: "도구는 React와 Recharts를 사용했고 인터랙션을 강화했습니다." },
    { start: 45 * SEC, end: 62 * SEC, text: "기준선을 클릭하면 해당 시간대 대사를 자동 하이라이트합니다." },
    { start: 62 * SEC, end: 78 * SEC, text: "데이터는 MSW/Mock API로 대체 가능하며 나중에 실제 API로 교체합니다." },
    { start: 78 * SEC, end: 95 * SEC, text: "시야 중심 유지, 표정 안정성, 발화 명료도 등을 점수화했습니다." },
    { start: 95 * SEC, end: 110 * SEC, text: "브러시로 특정 구간을 확대해 세부 분석이 가능합니다." },
    { start: 110 * SEC, end: 120 * SEC, text: "감사합니다." },
  ];
  return lines;
}

function buildDummySignals(durationSec = 120, stepMs = 500) {
  const out = [];
  const totalMs = durationSec * SEC;
  for (let t = 0; t <= totalMs; t += stepMs) {
    const gaze = 0.5 + 0.4 * Math.sin(t / 3000) + 0.1 * Math.sin(t / 1300 + 1);
    const sentiment = 0.5 + 0.5 * Math.sin(t / 5000 + 0.8);
    const energy = 0.5 + 0.5 * Math.sin(t / 2600 + 2.2);
    const combined = Math.max(0, Math.min(1, 0.45 * gaze + 0.35 * sentiment + 0.2 * energy)) * 100;
    out.push({ t, s: combined, gaze: Math.round(gaze * 100), sentiment: Math.round(sentiment * 100), energy: Math.round(energy * 100) });
  }
  return out;
}

function msToLabel(ms) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function findLineIndex(transcript, ms) {
  return transcript.findIndex((l) => ms >= l.start && ms < l.end);
}

function KPIChip({ title, value }) {
  return (
    <div className="px-3 py-2 rounded-2xl bg-white/70 backdrop-blur border shadow-sm">
      <div className="text-[11px] text-gray-500">{title}</div>
      <div className="text-sm font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function CustomTooltip({ active, label, payload }) {
  if (!active || !payload?.length) return null;
  const score = Math.round(payload.find((p) => p.dataKey === "s")?.value ?? 0);
  const g = payload.find((p) => p.dataKey === "gaze")?.value;
  const sen = payload.find((p) => p.dataKey === "sentiment")?.value;
  const en = payload.find((p) => p.dataKey === "energy")?.value;
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="rounded-xl border bg-white/95 shadow-md p-3 text-[12px]">
      <div className="font-medium mb-1">{msToLabel(Number(label))}</div>
      <div className="flex gap-4">
        <div><span className="text-gray-500">score</span> <span className="font-semibold">{score}</span></div>
        {g !== undefined && <div><span className="text-gray-500">gaze</span> <span className="font-semibold">{g}</span></div>}
        {sen !== undefined && <div><span className="text-gray-500">sent.</span> <span className="font-semibold">{sen}</span></div>}
        {en !== undefined && <div><span className="text-gray-500">energy</span> <span className="font-semibold">{en}</span></div>}
      </div>
    </motion.div>
  );
}

export default function InteractiveEmotionChart() {
  const transcript = useMemo(buildDummyTranscript, []);
  const data = useMemo(() => buildDummySignals(120, 500), []);

  const [selectedMs, setSelectedMs] = useState(0);
  const [domain, setDomain] = useState([0, 120 * SEC]);
  const [dragging, setDragging] = useState(false);

  const chartRef = useRef(null);

  const ticks = useMemo(() => {
    const [minX, maxX] = domain;
    const step = 10 * SEC;
    const arr = [];
    for (let t = minX; t <= maxX; t += step) arr.push(t);
    return arr;
  }, [domain]);

  function pxToTime(ev) {
    if (!chartRef.current) return selectedMs;
    const div = chartRef.current.getBoundingClientRect();
    const xPx = ev.clientX - div.left;
    const [minX, maxX] = domain;
    return clamp(minX + (xPx / div.width) * (maxX - minX), minX, maxX);
  }

  function handleChartMouseDown(e) {
    setDragging(true);
    setSelectedMs(pxToTime(e));
  }
  function handleChartMouseMove(e) {
    if (!dragging) return;
    setSelectedMs(pxToTime(e));
  }
  function handleChartMouseUp() { setDragging(false); }
  function handleChartClick(e) { setSelectedMs(pxToTime(e)); }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") setSelectedMs((v) => clamp(v - 500, domain[0], domain[1]));
      if (e.key === "ArrowRight") setSelectedMs((v) => clamp(v + 500, domain[0], domain[1]));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [domain]);

  const activePoint = useMemo(() => {
    return data.reduce((best, cur) => (Math.abs(cur.t - selectedMs) < Math.abs(best.t - selectedMs) ? cur : best));
  }, [data, selectedMs]);

  const charTranscript = useMemo(() => {
    return transcript.map((line) => {
      const chars = Array.from(line.text);
      const total = Math.max(chars.length, 1);
      return chars.map((ch, i) => {
        const start = line.start + ((line.end - line.start) * i) / total;
        const end = line.start + ((line.end - line.start) * (i + 1)) / total;
        return { ch, start, end };
      });
    });
  }, [transcript]);

  function jumpToNearestLineStart(ms) {
    const idx = findLineIndex(transcript, ms);
    if (idx >= 0) setSelectedMs(transcript[idx].start);
    else setSelectedMs(ms);
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">

      </div>

      <div
        ref={chartRef}
        onMouseDown={handleChartMouseDown}
        onMouseMove={handleChartMouseMove}
        onMouseUp={handleChartMouseUp}
        onMouseLeave={handleChartMouseUp}
        onClick={handleChartClick}
        className="rounded-3xl border bg-gradient-to-b from-white/90 to-white/60 backdrop-blur shadow-md p-3 select-none"
      >
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={data} margin={{ top: 18, right: 28, bottom: 8, left: 0 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
            <XAxis dataKey="t" type="number" domain={domain} ticks={ticks} tickFormatter={(v) => msToLabel(Number(v))} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: 8 }} />
            <Line type="monotone" dataKey="s" name="score" stroke="url(#scoreGradient)" strokeWidth={3} dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />
            <ReferenceLine x={selectedMs} stroke="#2563eb" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
        <div className="relative">
          <div
            className="absolute -top-2 translate-x-[-50%]"
            style={{ left: `${((selectedMs - domain[0]) / (domain[1] - domain[0])) * 100}%` }}
          >
            <motion.div layout className="px-2 py-1 rounded-full text-[11px] bg-blue-600 text-white shadow">
              {msToLabel(selectedMs)}
            </motion.div>
          </div>
        </div>
      </div>


      <div className="mt-4 rounded-2xl p-4 bg-white/80 backdrop-blur border shadow-sm">
        <div className="flex items-center justify-between mb-3">
        </div>

        <div className="space-y-3 max-h-72 overflow-auto pr-2 font-[15px] leading-7">
          {charTranscript.map((chars, li) => {
            const line = transcript[li];
            const activeLine = selectedMs >= line.start && selectedMs < line.end;
            return (
              <div key={li} className="relative rounded-xl p-2">
                <div className="text-[11px] text-gray-500 mb-1 font-mono">
                  {msToLabel(line.start)} ~ {msToLabel(line.end)}
                </div>
                <div className="whitespace-pre-wrap">
                  {chars.map((c, ci) => {
                    const on = selectedMs >= c.start && selectedMs < c.end;
                    const past = selectedMs >= c.end;
                    return (
                      <span
                        key={ci}
                        className={
                          "cursor-pointer transition-colors " +
                          (on ? "bg-blue-200 text-blue-900 rounded px-0.5" : past ? "text-gray-900" : "text-gray-500")
                        }
                        title={`${msToLabel(c.start)} ~ ${msToLabel(c.end)}`}
                        onClick={() => setSelectedMs(c.start)}
                      >
                        {c.ch}
                      </span>
                    );
                  })}
                </div>
                <div
                  className="h-[2px] mt-1 rounded-full"
                  style={{
                    width: `${clamp(((selectedMs - line.start) / (line.end - line.start)) * 100, 0, 100)}%`,
                    background: activeLine ? "#93c5fd" : "#e5e7eb",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
