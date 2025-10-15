import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const STEPS = {
  UPLOAD: "UPLOAD",
  QUESTIONS: "QUESTIONS",
  DEVICES: "DEVICES",
  CALIB: "CALIB",
  INTERVIEW: "INTERVIEW",
  DONE: "DONE",
};

export const useInterviewStore = create(
  persist(
    (set, get) => ({
      step: STEPS.UPLOAD,
      interviewNo: "",
      title: "",
      selectedQuestions: [], // [{questionId, text, source}... (max 3)]

      // setters
      setStep: (step) => set({ step }),
      setInterviewNo: (no) => set({ interviewNo: String(no || "") }),
      setTitle: (title) => set({ title: title?.trim() || "" }),
      setSelectedQuestions: (qs) => set({ selectedQuestions: qs || [] }),

      // helper: initialize from sessionStorage (optional)
      hydrateFromSession: () => {
        const no = sessionStorage.getItem("interviewNo");
        const t = sessionStorage.getItem("interviewTitle");
        if (no) set({ interviewNo: String(no) });
        if (t) set({ title: t });
      },

      reset: () =>
        set({
          step: STEPS.UPLOAD,
          interviewNo: "",
          title: "",
          selectedQuestions: [],
        }),
    }),
    {
      name: "interview-flow",
      storage: createJSONStorage(() => sessionStorage), // 세션 단위 유지
      partialize: (s) => ({
        step: s.step,
        interviewNo: s.interviewNo,
        title: s.title,
        selectedQuestions: s.selectedQuestions,
      }),
    }
  )
);
