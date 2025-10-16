// src/components/EmotionDonut.jsx
import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from "recharts";

// 프로젝트에서 쓰는 공통 키와 팔레트
const EMOTIONS = ["neutral", "happy", "sad", "angry", "fear", "disgust", "surprise"];
const COLORS = {
  // 팔레트는 필요하면 팀 색상으로 교체
  neutral:  "#c6cacfff", // slate-400
  happy:    "#f59e0b", // amber-500
  surprise: "#22c55e", // green-500
  sad:      "#3b82f6", // blue-500
  angry:    "#ef4444", // red-500
  fear:     "#8b5cf6", // violet-500
  disgust:  "#10b981", // emerald-500
};

// 가장 가까운 프레임
function nearestFrame(data, t) {
  if (!data?.length) return null;
  let best = data[0], diff = Math.abs(t - data[0].t);
  for (const f of data) {
    const d = Math.abs(t - f.t);
    if (d < diff) { best = f; diff = d; }
  }
  return best;
}

/**
 * props:
 *  - data: [{ t, neutral, happy, sad, angry, fear, disgust, surprise }, ...] // 0~100
 *  - cursorTime: number (초)
 *  - mode?: "frame" | "avg"               // frame: 해당 시점 비율, avg: 전체 평균 비율
 *  - height?: number                       // 차트 높이(px)
 */
export default function EmotionDonut({ data = [], cursorTime = 0, mode = "frame", height = 220 }) {
  const donutData = useMemo(() => {
    if (!data?.length) return [];

    if (mode === "avg") {
      // 전체 구간 평균
      const acc = Object.fromEntries(EMOTIONS.map(k => [k, 0]));
      for (const f of data) {
        for (const k of EMOTIONS) acc[k] += (f[k] ?? 0);
      }
      const n = data.length || 1;
      return EMOTIONS.map(k => ({ name: k, value: acc[k] / n }));
    }

    // mode === "frame": 현재 프레임
    const f = nearestFrame(data, cursorTime) ?? {};
    return EMOTIONS.map(k => ({ name: k, value: f[k] ?? 0 }));
  }, [data, cursorTime, mode]);

  const total = useMemo(
    () => donutData.reduce((s, d) => s + (d.value || 0), 0),
    [donutData]
  );

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
            endAngle={-270}   // 시계 방향
            isAnimationActive
          >
            {donutData.map((entry, idx) => (
              <Cell key={entry.name} fill={COLORS[entry.name] || "#999999"} />
            ))}
          </Pie>

          <Tooltip
            formatter={(v, n) => [`${v.toFixed(1)}%`, n]}
            separator=" "
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => value}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* 중앙 합계(선택) */}
      <div className="pointer-events-none -mt-24 flex items-center justify-center">
        <div className="text-center">

          <div className="text-lg font-semibold justify-center">{total.toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
}
