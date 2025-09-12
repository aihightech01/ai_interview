import { createContext, useContext } from "react";

export const InterviewCtx = createContext(null);
export const useInterview = () => useContext(InterviewCtx);
