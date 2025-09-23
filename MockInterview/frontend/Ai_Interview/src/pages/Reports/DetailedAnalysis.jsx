import { useRef, useState } from "react";
import AnalysisTab from "../AnalysisTab";
import ChartArea from "./ChartArea";
import { RiEmotionFill } from "react-icons/ri";
import {
  HiMiniChatBubbleOvalLeftEllipsis,
  HiMiniKey,
} from "react-icons/hi2";
import { formatInterviewSetTime } from "@/utils/formatDateTime";
import ReactPlayer from "react-player";

export default function DetailedAnalysis({ type, question, analysisDetail, date }) {
  const [activeTab, setActiveTab] = useState("emotion"); // 기본 탭
  const [currentTime, setCurrentTime] = useState(0); // ★ 현재 영상 재생 시간
  const videoRef = useRef(null);

  const videoLength = analysisDetail.videoLength;

  // 핵심 키워드
  const answer = analysisDetail.answer;
  const keywords = analysisDetail.keywordList || [];
  const includedKeywords = keywords.filter((keyword) => answer.includes(keyword));
  const includedCount = includedKeywords.length;

  // 의도 분석
  const labels = (analysisDetail.intentList || []).map((item) => item.expression);

  // 감정 분석
  const emotion = analysisDetail.emotionMap?.ratio || {};
  let emotionMessage = "";
  const highestRatio = Math.max(emotion.positive || 0, emotion.negative || 0, emotion.neutral || 0);
  if (highestRatio === emotion.positive) {
    emotionMessage = "표정이 밝은 편이며 긍정적입니다.";
  } else if (highestRatio === emotion.negative) {
    emotionMessage = "표정이 어두운 편이며 부정적입니다.";
  } else {
    emotionMessage = "무표정이 많습니다.";
  }

  // ★ 차트에서 새로운 시간 지정 시 → 비디오로 이동
  const handleChartTimeUpdate = (newTime) => {
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.seekTo(newTime, "seconds");
    }
  };

  // ★ 비디오 진행 시 → currentTime 업데이트
  const handleProgress = (progress) => {
    setCurrentTime(progress.playedSeconds);
  };

  const url = `${import.meta.env.VITE_BASE_URL}/file/download/video?path=${analysisDetail.videoPath}`;

  return (
    <div>
      <AnalysisTab activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="pt-10 px-7">
        <div className="flex gap-14">
          {/* 좌측: 영상 + 요약 */}
          <div className="w-1/2">
            <div className="w-full flex justify-center bg-black">
              <ReactPlayer
                width={430}
                height={280}
                url={url}
                controls
                playing
                ref={videoRef}
                onProgress={handleProgress}
              />
            </div>
            <div className="flex justify-between px-1 pt-4 pb-1">
              <span className="text-MAIN1">{type === "mock" ? "모의 면접" : "실전 면접"}</span>
              <span className="text-UNIMPORTANT_TEXT mr-1">
                {formatInterviewSetTime(date)}
              </span>
            </div>
            <span className="font-semibold text-BLACK mx-1">Q. {question}</span>

            {/* 요약 */}
            <div className="border-b-2 border-gray my-5"></div>
            <div className="py-1">
              <div className="border-2 border-gray rounded-lg p-7 text-UNIMPORTANT_TEXT">
                <div className="flex items-start gap-3 pb-4">
                  <RiEmotionFill size={25} />
                  <p className="font-semibold">{emotionMessage}</p>
                </div>
                <div className="flex items-start gap-3 pb-4">
                  <HiMiniChatBubbleOvalLeftEllipsis size={25} />
                  <p>
                    답변의 주요 의도는{" "}
                    <span className="font-semibold">
                      {labels[0]}, {labels[1]}, {labels[2]}
                    </span>{" "}
                    입니다.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <HiMiniKey size={25} />
                  <p>
                    핵심 키워드{" "}
                    <span className="font-semibold">
                      {keywords.length}개 중 {includedCount}개 포함
                    </span>{" "}
                    되었습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 우측: 차트 */}
          <div className="w-1/2">
            <ChartArea
              activeTab={activeTab}
              analysisDetail={analysisDetail}
              currentTime={currentTime}              // ★ 현재 비디오 시간 전달
              handleChartTimeUpdate={handleChartTimeUpdate} // ★ 차트 → 비디오 이동
              videoLength={videoLength}
              emotionMessage={emotionMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
