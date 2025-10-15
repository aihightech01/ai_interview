import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";

// 한 군데에서만 createContext 호출
const InterviewCtx = createContext(null);

// 외부에서 쓰는 훅
export function useInterview() {
  return useContext(InterviewCtx);
}

// Provider
export function InterviewProvider({ children }) {
  // 전역 상태
  const [selected, setSelected] = useState([]);   // [{questionId, text, source}]
  const [session, setSession]   = useState(null); // { sessionId, ... }
  const [currentIdx, setIdx]    = useState(0);
  const [analysisId, setAid]    = useState(null);

  // 세션 생성 (선택 질문 기반)
  const createSession = useCallback(async () => {
    if (!selected || selected.length === 0) {
      throw new Error("질문을 1개 이상 선택하세요.");
    }

    // 서버에 questionIds 전달
    const payload = { questionIds: selected.map((q) => q.questionId) };

    // axiosInstance 사용
    const { data } = await axiosInstance.post(API_PATHS.INTERVIEWS, payload);

    // 응답을 세션으로 보관
    setSession(data);
    setIdx(0);
    return data; // 필요 시 sessionId 반환 등
  }, [selected]);

  // 필요시 초기화 도우미
  const reset = useCallback(() => {
    setSelected([]);
    setSession(null);
    setIdx(0);
    setAid(null);
  }, []);

  const value = useMemo(
    () => ({
      selected, setSelected,
      session, setSession,
      currentIdx, setIdx,
      analysisId, setAid,
      createSession,
      reset,
    }),
    [selected, session, currentIdx, analysisId, createSession, reset]
  );

  return <InterviewCtx.Provider value={value}>{children}</InterviewCtx.Provider>;
}
