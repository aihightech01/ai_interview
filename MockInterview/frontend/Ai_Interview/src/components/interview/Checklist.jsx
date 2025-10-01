// src/components/interview/ChecklistBox.jsx
import React from "react";

/**
 * 체크리스트 박스
 * @param {Object} props
 * @param {string} props.title - 박스 상단에 표시할 제목
 * @param {Array<{ id: string, label: string, checked: boolean }>} props.items - 체크 항목 배열
 * @param {React.ReactNode} [props.extra] - 버튼 같은 추가 UI (옵션)
 */
export default function ChecklistBox({ title, items, extra }) {
  return (
    <div className="p-4 rounded-xl border bg-white">
      {/* 제목 */}
      <div className="font-medium mb-3">{title}</div>

      {/* 체크리스트 목록 */}
      <ul className="text-sm space-y-2 text-slate-700">
        {items.map((it) => (
          <li key={it.id}>
            {it.checked ? "✅" : "⏳"} {it.label}
          </li>
        ))}
      </ul>

      {/* 추가 요소 (예: 스피커 테스트 버튼) */}
      {extra ? <div className="mt-4">{extra}</div> : null}
    </div>
  );
}
