import React from "react";

const ScoreCircle = ({ score = 75, id = "score-grad" }) => {
  const radius = 40;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;

  // 0~100 범위로 고정
  const progress = Math.max(0, Math.min(100, Number(score))) / 100;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="relative w-[100px] h-[100px]">
      <svg
        height="100%"
        width="100%"
        viewBox="0 0 100 100"
        className="transform -rotate-90"
        role="img"
        aria-label={`Score ${Math.round(progress * 100)} out of 100`}
      >
        {/* 배경 원 */}
        <circle
          cx="50"
          cy="50"
          r={normalizedRadius}
          stroke="#e5e7eb"
          strokeWidth={stroke}
          fill="transparent"
        />

        {/* 그라디언트 정의 (여러 인스턴스 대비 id 주입) */}
        <defs>
          <linearGradient id={id} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#97d5ffff" />
            <stop offset="100%" stopColor="#5171FF" />
          </linearGradient>
        </defs>

        {/* 진행 원 */}
        <circle
          cx="50"
          cy="50"
          r={normalizedRadius}
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>

      {/* 중앙 점수 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-semibold text-sm">{`${Math.round(progress * 100)}/100`}</span>
      </div>
    </div>
  );
};

export default ScoreCircle;
