// src/context/InterviewContext.jsx
import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";

const InterviewCtx = createContext(null);
export const useInterview = () => useContext(InterviewCtx);

export function InterviewProvider({ children }) {
  const [selected, setSelected] = useState([]);   // [{questionId, text, source}]
  const [session, setSession]   = useState(null); // { sessionId, ... }
  const [currentIdx, setIdx]    = useState(0);
  const [analysisId, setAid]    = useState(null);

  const createSession = useCallback(async () => {
    if (!selected || selected.length === 0) {
      throw new Error("질문을 1개 이상 선택하세요.");
    }
    const payload = { questionIds: selected.map((q) => q.questionId) };
    const { data } = await axiosInstance.post(API_PATHS.INTERVIEWS, payload);
    setSession(data);
    setIdx(0);
    return data;
  }, [selected]);

  const reset = useCallback(() => {
    setSelected([]);
    setSession(null);
    setIdx(0);
    setAid(null);
  }, []);

  const value = useMemo(() => ({
    selected, setSelected,
    session, setSession,
    currentIdx, setIdx,
    analysisId, setAid,
    createSession,
    reset,
  }), [selected, session, currentIdx, analysisId, createSession, reset]);

  return <InterviewCtx.Provider value={value}>{children}</InterviewCtx.Provider>;
}
