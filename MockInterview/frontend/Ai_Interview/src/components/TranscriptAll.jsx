// src/components/TranscriptAll.jsx
import React from "react";

export default function TranscriptAll({ items, currentTime, onClickLine }) {
  // currentTime이 포함된 문장 찾기
  const activeIdx = items.findIndex(
    (s) => currentTime >= s.start && currentTime < s.end
  );

  return (
    <div className="h-56 overflow-auto rounded-xl bg-white border border-gray-200 p-3 space-y-2">
      {items.map((s, i) => {
        const active = i === activeIdx;
        return (
          <div
            key={i}
            onClick={() => onClickLine?.(s.start)}
            className={`text-sm px-2 py-1 rounded cursor-pointer transition ${
              active
                ? "text-blue-600 font-semibold bg-blue-50"
                : "text-gray-800 hover:bg-gray-50"
            }`}
            title={`[${s.start.toFixed(1)}s ~ ${s.end.toFixed(1)}s]`}
          >
            {s.text}
            <span className="ml-2 text-[11px] text-gray-400">
              [{s.start.toFixed(1)}~{s.end.toFixed(1)}s]
            </span>
          </div>
        );
      })}
    </div>
  );
}
