import React, { useEffect, useRef, useState } from "react";
import { useInterview } from "../../context/InterviewContext";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { formatSec } from "../../utils/helper";

// Figma: 상단 진행도, 타이머(최대 60초), REC/재촬영/다음 버튼  :contentReference[oaicite:9]{index=9}

export default function Interview(){
  const { selected, session, currentIdx, setIdx } = useInterview();
  const { sessionId: routeId } = useParams();
  const nav = useNavigate();
  const q = selected[currentIdx];
  const [sec, setSec] = useState(0);
  const [rec, setRec] = useState(false);
  const [blob, setBlob] = useState(null);
  const mediaRef = useRef(null);
  const mr = useRef(null);

  // 세션 아이디 확보(새로고침 대비)
  const sid = session?.sessionId || routeId;

  useEffect(()=>{ // 간단 타이머
    if(!rec) return;
    const t = setInterval(()=>setSec(s=>s+1), 1000);
    return ()=>clearInterval(t);
  }, [rec]);

  async function startRec(){
    const stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    mediaRef.current.srcObject = stream; mediaRef.current.play();
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    recorder.ondataavailable = (e)=> e.data.size && chunks.push(e.data);
    recorder.onstop = ()=> setBlob(new Blob(chunks, { type:"video/webm" }));
    mr.current = recorder; recorder.start();
    setSec(0); setRec(true);
  }

  function stopRec(){
    mr.current?.stop();
    mediaRef.current?.srcObject?.getTracks().forEach(t=>t.stop());
    setRec(false);
  }

  async function uploadAndNext(){
    if(!blob) return alert("녹화된 영상이 없어요.");
    // 1) 업로드 티켓
    const { data: ticket } = await api.post(API_PATHS.MEDIA.TICKET, {
      sessionId: sid, questionId: q.questionId, contentType: "video/webm",
    });
    // 2) PUT 업로드 (사전서명 URL)
    await fetch(ticket.uploadUrl, { method:"PUT", headers:{ "Content-Type": "video/webm" }, body: blob });
    // 3) confirm
    await api.post(API_PATHS.MEDIA.CONFIRM, {
      mediaId: ticket.mediaId, sessionId: sid, questionId: q.questionId, durationSec: sec
    });

    // 다음 문항
    const next = currentIdx + 1;
    if (next < selected.length) {
      setBlob(null); setSec(0); setIdx(next);
    } else {
      nav(`/interview/loading/${sid}`); // 모든 업로드 완료 → 분석
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm">{currentIdx+1}/{selected.length}</div>
        <div className="text-xl tabular-nums">{formatSec(sec)}</div>
        <button className="text-sm underline" onClick={()=>nav("/")}>연습 종료</button>
      </div>

      <div className="p-4 rounded-xl border">
        <div className="font-medium mb-2">Q{currentIdx+1}. {q?.text}</div>
        <video ref={mediaRef} className="w-full bg-black rounded-xl" muted playsInline />
        <div className="flex gap-2 mt-3">
            {!rec && <Button variant="primary" onClick={startRec}>REC</Button>}
            {rec &&  <Button variant="danger" onClick={stopRec}>녹화 종료</Button>}
            <Button onClick={()=>{ setBlob(null); setSec(0); }}>재촬영</Button>
            <Button variant="outline" disabled={!blob} onClick={uploadAndNext}>다음</Button>
        </div>
      </div>
    </div>
  );
}
