import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { sleep } from "../../utils/helper";

// Figma: "분석 중..." 메시지 → 완료 후 결과/마이페이지로 전환  :contentReference[oaicite:10]{index=10}
export default function Loading(){
  const { sessionId } = useParams();
  const nav = useNavigate();
  const [progress, setProgress] = useState(0);

    useEffect(() => {
    (async () => {
        const { data: job } = await axiosInstance.post(API_PATHS.ANALYSIS.CREATE, { sessionId });
        let done = false;
        while (!done) {
        const { data: s } = await axiosInstance.get(API_PATHS.ANALYSIS.STATUS(job.analysisId));
        setProgress(s.progress ?? 0);
        if (s.status === "DONE") { done = true; break; }
        if (s.status === "FAILED") { alert("분석 실패"); return; }
        await sleep(2000);
        }
        nav("/mypage");
    })();
    }, [sessionId, nav]);


  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="text-2xl font-semibold mb-2">분석 중…</div>
      <p className="text-sm text-slate-600 mb-4">발음/억양 · 표정 · 시선 · 키워드 일치도 분석 중</p>
      <div className="w-64 h-2 bg-slate-200 rounded">
        <div className="h-2 bg-black rounded" style={{width:`${progress}%`}}/>
      </div>
    </div>
  );
}
