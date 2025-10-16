// src/pages/Reports/components/EmotionDonut.jsx
import React, { useMemo } from "react";
import { PieChart, Pie, Tooltip, Legend, Cell, ResponsiveContainer } from "recharts";

const EMOTIONS = ["neutral", "happy", "sad", "angry", "fear", "disgust", "surprise"];
const COLORS = {
  neutral:  "#94a3b8",
  happy:    "#f59e0b",
  surprise: "#22c55e",
  sad:      "#3b82f6",
  angry:    "#ef4444",
  fear:     "#8b5cf6",
  disgust:  "#10b981",
};

function nearestByTime(arr, t, timeKey = "t") {
  if (!arr?.length) return null;
  let best = arr[0], diff = Math.abs((arr[0]?.[timeKey] ?? 0) - t);
  for (const it of arr) {
    const d = Math.abs((it?.[timeKey] ?? 0) - t);
    if (d < diff) { best = it; diff = d; }
  }
  return best;
}

/**
 * props:
 *  - data: [{ t, neutral, ... }]
 *  - cursorTime: number
 *  - mode: "frame" | "avg"
 *  - timeKey?: string (기본 "t")
 *  - height?: number
 */
export default function EmotionDonut({
  data = [],
  cursorTime = 0,
  mode = "frame",
  timeKey = "t",
  height = 220,
}) {
  const donutData = useMemo(() => {
    if (!data?.length) return [];

    if (mode === "avg") {
      const acc = Object.fromEntries(EMOTIONS.map(k => [k, 0]));
      for (const f of data) for (const k of EMOTIONS) acc[k] += (f[k] ?? 0);
      const n = data.length || 1;
      return EMOTIONS.map(k => ({ name: k, value: acc[k] / n }));
    }

    // mode === "frame": 현재 시간 근접값
    const f = nearestByTime(data, cursorTime, timeKey) ?? {};
    return EMOTIONS.map(k => ({ name: k, value: f[k] ?? 0 }));
  }, [data, cursorTime, mode, timeKey]);

  const total = useMemo(() => donutData.reduce((s, d) => s + (d.value || 0), 0), [donutData]);

  if (!donutData.length) {
    return <div className="text-xs text-gray-500">도넛에 표시할 감정 데이터가 없습니다.</div>;
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={donutData}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={90}
            startAngle={90}
            endAngle={-270}
            isAnimationActive
          >
            {donutData.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name] || "#999999"} />
            ))}
          </Pie>
          <Tooltip formatter={(v, n) => [`${Number(v).toFixed(1)}%`, n]} separator=" " />
          <Legend verticalAlign="bottom" height={36} formatter={(value) => value} />
        </PieChart>
      </ResponsiveContainer>

      {/* 중앙 합계(선택) */}
      <div className="pointer-events-none -mt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xs text-gray-500">{mode === "avg" ? "평균 비율" : "현재 프레임"}</div>
          <div className="text-lg font-semibold">{Math.round(total)}%</div>
        </div>
      </div>
    </div>
  );
}
