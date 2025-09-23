// // src/components/ChartDraggable.jsx
// import React, { useMemo, useState, useCallback } from "react";
// import {
//   LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ResponsiveContainer,
// } from "recharts";

// export default function ChartDraggable({
//   data,
//   duration,
//   cursorTime,
//   onChangeTime, // (t:number)=>void
// }) {
//   const [dragging, setDragging] = useState(false);
//   const domain = useMemo(
//     () => [0, Math.max(duration || 0, data.at(-1)?.t || 0)],
//     [duration, data]
//   );

//   // recharts의 onMouseMove에 들어오는 e.activeLabel을 사용하면 x값(시간)을 바로 얻을 수 있어요.
//   const handleMove = useCallback(
//     (e) => {
//       const t = e?.activeLabel;
//       if (typeof t === "number") {
//         if (dragging) onChangeTime?.(Math.max(domain[0], Math.min(domain[1], t)));
//       }
//     },
//     [dragging, domain, onChangeTime]
//   );

//   const handleClick = useCallback(
//     (e) => {
//       const t = e?.activeLabel;
//       if (typeof t === "number") {
//         onChangeTime?.(Math.max(domain[0], Math.min(domain[1], t)));
//       }
//     },
//     [domain, onChangeTime]
//   );

//   return (
//     <div
//       className="h-48 rounded-xl bg-white border border-gray-200 p-2 select-none"
//       onMouseLeave={() => setDragging(false)}
//     >
//       <ResponsiveContainer width="100%" height="100%">
//         <LineChart
//           data={data}
//           onMouseDown={() => setDragging(true)}
//           onMouseUp={() => setDragging(false)}
//           onMouseMove={handleMove}
//           onClick={handleClick}
//           margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
//         >
//           <CartesianGrid strokeDasharray="3 3" />
//           <XAxis
//             dataKey="t"
//             type="number"
//             domain={domain}
//             tickFormatter={(s) => `${Math.round(s)}s`}
//           />
//           <YAxis domain={[-1, 1]} />
//           <Tooltip
//             formatter={(v, n) => [Number.isFinite(v) ? v.toFixed(2) : v, n]}
//             labelFormatter={(l) => `${l?.toFixed?.(2)} s`}
//           />
//           {/* 감정 라인 예시: valence */}
//           <Line type="monotone" dataKey="valence" dot={false} strokeWidth={2} />
//           {/* 현재 커서(세로선) — 색상은 Tailwind가 아닌 recharts stroke로 지정 */}
//           <ReferenceLine x={cursorTime} stroke="#2563EB" strokeWidth={3} />
//         </LineChart>
//       </ResponsiveContainer>
//       <div className="mt-2 text-xs text-gray-600">
//         커서: <span className="font-semibold">{cursorTime.toFixed(2)} s</span>
//         <span className="ml-2 text-gray-400">(차트 클릭/드래그로 이동)</span>
//       </div>
//     </div>
//   );
// }

// src/components/ChartDraggable.jsx
import React, { useMemo, useState, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";

const DEFAULT_COLORS = {
  angry: "#ef4444",
  disgust: "#84cc16",
  fear: "#a855f7",
  happy: "#f59e0b",
  neutral: "#3b82f6",
  sad: "#0ea5e9",
  surprise: "#10b981",
};

export default function ChartDraggable({
  data,                  // [{t, angry, neutral, ...}]
  duration,              // 초 단위 길이 (없으면 data 마지막 t)
  cursorTime = 0,
  onChangeTime,          // (t:number)=>void
  series = ["neutral"],  // 표기할 키들
  yDomain = [0, 100],    // 감정 %라서 기본 0~100
  colors = DEFAULT_COLORS,
}) {
  const [dragging, setDragging] = useState(false);

  const domain = useMemo(() => {
    const maxT = Math.max(duration || 0, data?.at(-1)?.t || 0);
    return [0, maxT];
  }, [duration, data]);

  const handleMove = useCallback((e) => {
    const t = e?.activeLabel;
    if (typeof t === "number" && dragging) {
      onChangeTime?.(Math.max(domain[0], Math.min(domain[1], t)));
    }
  }, [dragging, domain, onChangeTime]);

  const handleClick = useCallback((e) => {
    const t = e?.activeLabel;
    if (typeof t === "number") {
      onChangeTime?.(Math.max(domain[0], Math.min(domain[1], t)));
    }
  }, [domain, onChangeTime]);

  return (
    <div
      className="h-64 rounded-xl bg-white border border-gray-200 p-2 select-none"
      onMouseLeave={() => setDragging(false)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          onMouseDown={() => setDragging(true)}
          onMouseUp={() => setDragging(false)}
          onMouseMove={handleMove}
          onClick={handleClick}
          margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="t"
            type="number"
            domain={domain}
            tickFormatter={(s) => `${Math.round(s)}s`}
          />
          <YAxis domain={yDomain} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            formatter={(v, n) => [Number.isFinite(v) ? `${v.toFixed(2)}%` : v, n]}
            labelFormatter={(l) => `${l?.toFixed?.(2)} s`}
          />
          <Legend />
          {/* 현재 커서(세로선) */}
          <ReferenceLine x={cursorTime} stroke="#2563EB" strokeWidth={3} />

          {/* 선택된 시리즈를 라인으로 렌더 */}
          {series.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={key}
              dot={false}
              stroke={colors[key] || "#555"}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-2 text-xs text-gray-600">
        커서: <span className="font-semibold">{cursorTime.toFixed(2)} s</span>
        <span className="ml-2 text-gray-400">(차트 클릭/드래그로 이동)</span>
      </div>
    </div>
  );
}
