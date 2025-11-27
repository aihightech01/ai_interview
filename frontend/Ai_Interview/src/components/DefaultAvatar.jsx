// DefaultAvatar.jsx
import React from "react";

const DefaultAvatar = ({ size = 128, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 128 128"
    role="img"
    aria-label="Default avatar"
    className={className}
  >
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f3f4f6" />
        <stop offset="100%" stopColor="#e5e7eb" />
      </linearGradient>
      <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
        <feOffset dy="1" result="offset" />
        <feMerge>
          <feMergeNode in="offset" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Background */}
    <circle cx="64" cy="64" r="64" fill="url(#bg)" />
    <circle cx="64" cy="64" r="63.5" fill="none" stroke="#d1d5db" />

    {/* Silhouette (head + shoulders) */}
    {/* ✅ 중앙 정렬: 살짝 좌표 재조정 */}
    <g transform="translate(-2, 0)">
      {/* shoulders shadow */}
      <path
        d="M28 96c6-16 22.5-26 38-26s32 10 38 26v6H28v-6z"
        fill="#000"
        opacity=".06"
        filter="url(#soft)"
      />
      {/* head */}
      <circle cx="64" cy="50" r="18" fill="#ffffff" />
      {/* shoulders */}
      <path
        d="M29 96c5.5-14.5 20.8-24 34-24s28.5 9.5 34 24v6H32v-6z"
        fill="#ffffff"
      />
    </g>
  </svg>
);

export default DefaultAvatar;
