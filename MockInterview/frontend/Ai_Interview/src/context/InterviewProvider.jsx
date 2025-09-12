import React, { useMemo, useState, useCallback } from "react";
import { API_PATHS } from "../utils/apiPaths";
import { InterviewCtx } from "./InterviewContext";

export default function InterviewProvider({ children }) {
  const [selected, setSelected] = useState([]);     // Question[]
  const [session, setSession]   = useState(null);   // {sessionId, ...}
  const [currentIdx, setIdx]    = useState(0);
  const [analysisId, setAid]    = useState(null);

  // selected를 참조하므로 useCallback으로 안정화
  const createSession = useCallback(async () => {
    if (selected.length === 0) throw new Error("질문을 1개 이상 선택하세요.");
    const { data } = await api.post(API_PATHS.INTERVIEWS, {
      questionIds: selected.map((q) => q.questionId),
    });
    setSession(data);
    setIdx(0);
    return data;
  }, [selected]);

  const value = useMemo(() => ({
    selected, setSelected,
    session, setSession,
    currentIdx, setIdx,
    analysisId, setAid,
    createSession,        // ← 컨텍스트로 외부에 제공 (중요)
  }), [selected, session, currentIdx, analysisId, createSession]);

  return <InterviewCtx.Provider value={value}>{children}</InterviewCtx.Provider>;
}
