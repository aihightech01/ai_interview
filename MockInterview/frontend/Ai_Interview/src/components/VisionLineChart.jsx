import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  Brush,
} from "recharts";

// vision 원본 배열 -> recharts 데이터 포맷으로 정규화
function normalizeVision(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((d) => ({
    frame: d.frame,
    headYaw: Number(d.head_yaw),
    headPitch: Number(d.head_pitch),
    gazeYaw: Number(d.gaze_yaw),
    gazePitch: Number(d.gaze_pitch),
    score: Number(d.score),
  }));
}

export default function VisionLineChart({
  data,                          // vision 배열
  series = ["headYaw", "gazeYaw"] // 어떤 라인을 그릴지
}) {
  const chartData = useMemo(() => normalizeVision(data), [data]);
  if (!chartData.length) {
    return <div className="text-xs text-gray-500">표시할 시선/머리각 데이터가 없습니다.</div>;
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="frame" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
          <Tooltip
            formatter={(v, name) => [`${Number(v).toFixed(2)}°`, name]}
            labelFormatter={(l) => `frame ${l}`}
          />
          <Legend />
          {/* 0도 기준선 */}
          <ReferenceLine y={0} stroke="#999" strokeDasharray="4 3" />

          {series.includes("headYaw") && (
            <Line type="monotone" dataKey="headYaw" name="Head Yaw" dot={false} stroke="#2563eb" strokeWidth={2} />
          )}
          {series.includes("gazeYaw") && (
            <Line type="monotone" dataKey="gazeYaw" name="Gaze Yaw" dot={false} stroke="#16a34a" strokeWidth={2} />
          )}
          {series.includes("headPitch") && (
            <Line type="monotone" dataKey="headPitch" name="Head Pitch" dot={false} stroke="#7c3aed" strokeWidth={1.5} />
          )}
          {series.includes("gazePitch") && (
            <Line type="monotone" dataKey="gazePitch" name="Gaze Pitch" dot={false} stroke="#ea580c" strokeWidth={1.5} />
          )}
          {series.includes("score") && (
            <Line type="monotone" dataKey="score" name="score" dot={false} stroke="#eac90cff" strokeWidth={1.5} />
          )}

          {/* 하단 미니 뷰로 구간 확대/축소 */}
          <Brush dataKey="frame" height={16} travellerWidth={8} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
