// src/pages/session/SessionDetailBody.jsx
import React, { useRef, useState, useCallback } from "react";
import EmotionChartDraggable from "../../components/EmotionChartDraggable";
import TranscriptAll from "../../components/TranscriptAll";

// 더미 데이터
const DEMO_EMOTIONS = [
  { t: 0, valence: 0.1 }, { t: 1, valence: -0.2 }, { t: 2, valence: 0.3 },
  { t: 3, valence: 0.0 }, { t: 4, valence: 0.5 }, { t: 5, valence: 0.2 },
  { t: 6, valence: -0.1 }, { t: 7, valence: 0.4 }, { t: 8, valence: 0.2 },
];

const DEMO_TRANSCRIPT = [
  { start: 0.0, end: 2.4, text: "안녕하세요, 저는 김은혜입니다." },
  { start: 2.4, end: 5.0, text: "AI 면접 코치 서비스를 소개하겠습니다." },
  { start: 5.0, end: 7.5, text: "그래프와 대본이 같은 타임라인으로 동기화됩니다." },
  { start: 7.5, end: 10.0, text: "세로선을 움직이면 해당 구간의 대사가 파랗게 표시됩니다." },
];

export default function SessionDetailBody({ withVideo = false, videoUrl }) {
  const [cursorTime, setCursorTime] = useState(0);
  const duration = 10; // 데모용

  // (선택) 영상까지 묶고 싶다면 아래 ref로 연결
  const videoRef = useRef(null);
  const seek = useCallback((t) => {
    setCursorTime(t);
    if (withVideo && videoRef.current) {
      videoRef.current.currentTime = t;
    }
  }, [withVideo]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 좌측: (선택) 영상 */}
      <div>
        <p className="text-xs text-gray-500 mb-2">실전 면접 영상 미리보기</p>
        <div className="aspect-video rounded-xl bg-black overflow-hidden grid place-items-center text-white/60">
          {withVideo ? (
            <video ref={videoRef} controls className="w-full h-full">
              <source src={videoUrl} type="video/mp4" />
            </video>
          ) : (
            <span>영상(옵션) — 지금은 커서/대본 동기화만 확인</span>
          )}
        </div>
      </div>

      {/* 우측: 그래프 + 전체 대본 */}
      <div className="flex flex-col gap-3">
        <p className="text-xs text-gray-500">감정 지표(Valence) — 드래그로 커서 이동</p>
        <EmotionChartDraggable
          data={DEMO_EMOTIONS}
          duration={duration}
          cursorTime={cursorTime}
          onChangeTime={seek}
        />

        <p className="text-xs text-gray-500">전체 대본 — 커서 시간의 문장만 파란색</p>
        <TranscriptAll
          items={DEMO_TRANSCRIPT}
          currentTime={cursorTime}
          onClickLine={seek} // 줄 클릭으로 커서 점프
        />
      </div>
    </div>
  );
}
