// src/stores/interviewStore.js
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

// ── 내부 유틸 (구분선/의미없는 텍스트 거르기: 선택 질문 추가 시 사용) ──
const isBadText = (t = "") =>
  !String(t).trim() ||
  /^[-–—•·\s]+$/.test(t) ||
  /^-{2,}$/.test(t) ||
  /^—{2,}$/.test(t);

export const useInterviewStore = create(
  persist(
    (set, get) => ({
      // ── 상태 ─────────────────────────────────────────────
      isHydrated: false,        // persist 복원 완료 여부
      step: STEPS.UPLOAD,
      interviewNo: "",

      // 인터뷰 메타
      title: "",                // 인터뷰 제목
      interviewType: null,      // 1 | 2
      interviewTypeLabel: "",   // "실전 면접" | "모의 면접"
      interviewTypeColor: "blue", // "emerald" | "blue"

      // 질문 선택 (최대 3)
      selectedQuestions: [],    // [{questionId, text, source}]

      // ── 액션 ─────────────────────────────────────────────
      setHydrated: (v) => set({ isHydrated: !!v }),

      setStep: (step) => set({ step }),

      setInterviewNo: (no) => {
        const value = String(no || "");
        set({ interviewNo: value });
        // 세션 미러링 (필요할 때만)
        try { sessionStorage.setItem("interviewNo", value); } catch {}
      },

      setTitle: (title) => {
        const value = (title ?? "").trim();
        set({ title: value });
        try { sessionStorage.setItem("interviewTitle", value); } catch {}
      },

      setInterviewTypeMeta: ({ type, label, color }) => {
        const interviewType = type ?? null;
        const interviewTypeLabel = label ?? (type === 1 ? "실전 면접" : "모의 면접");
        const interviewTypeColor = color ?? (type === 1 ? "emerald" : "blue");
        set({ interviewType, interviewTypeLabel, interviewTypeColor });

        try {
          sessionStorage.setItem("interviewType", String(interviewType ?? ""));
          sessionStorage.setItem("interviewTypeLabel", interviewTypeLabel);
          sessionStorage.setItem("interviewTypeColor", interviewTypeColor);
        } catch {}
      },

      // 여러 페이지에서 공용으로 쓰는 하이드레이터 (세션 → 스토어)
      hydrateFromSession: () => {
        try {
          const no = sessionStorage.getItem("interviewNo");
          const t = sessionStorage.getItem("interviewTitle");
          const typeStr = sessionStorage.getItem("interviewType");
          const typeLabel = sessionStorage.getItem("interviewTypeLabel");
          const typeColor = sessionStorage.getItem("interviewTypeColor");

          const patch = {};
          if (no) patch.interviewNo = String(no);
          if (t) patch.title = t;
          if (typeStr) patch.interviewType = Number(typeStr);
          if (typeLabel) patch.interviewTypeLabel = typeLabel;
          if (typeColor) patch.interviewTypeColor = typeColor;

          if (Object.keys(patch).length) set(patch);
        } catch {}
      },

      // 선택 질문 관련 (최대 3개 보장)
      setSelectedQuestions: (qs) => {
        const arr = Array.isArray(qs) ? qs : [];
        const filtered = arr
          .filter((q) => q && q.questionId && !isBadText(q.text))
          .slice(0, 3);
        set({ selectedQuestions: filtered });
      },

      clearQuestions: () => set({ selectedQuestions: [] }),

      addQuestion: (q) => {
        if (!q || !q.questionId || isBadText(q.text)) return;
        const cur = get().selectedQuestions || [];
        if (cur.some((x) => x.questionId === q.questionId)) return; // 중복 방지
        if (cur.length >= 3) return; // 상한

        set({ selectedQuestions: [...cur, q] });
      },

      removeQuestion: (questionId) => {
        const cur = get().selectedQuestions || [];
        set({ selectedQuestions: cur.filter((x) => x.questionId !== questionId) });
      },

      toggleQuestion: (q) => {
        if (!q || !q.questionId || isBadText(q.text)) return;
        const cur = get().selectedQuestions || [];
        const exists = cur.some((x) => x.questionId === q.questionId);
        if (exists) {
          set({ selectedQuestions: cur.filter((x) => x.questionId !== q.questionId) });
        } else if (cur.length < 3) {
          set({ selectedQuestions: [...cur, q] });
        }
      },

      reset: () =>
        set({
          isHydrated: true,
          step: STEPS.UPLOAD,
          interviewNo: "",
          title: "",
          interviewType: null,
          interviewTypeLabel: "",
          interviewTypeColor: "blue",
          selectedQuestions: [],
        }),
    }),
    {
      name: "interview-flow",
      version: 2, // ← persist 스키마 버전
      storage: createJSONStorage(() => sessionStorage), // 세션 단위 유지
      partialize: (s) => ({
        step: s.step,
        interviewNo: s.interviewNo,
        title: s.title,
        interviewType: s.interviewType,
        interviewTypeLabel: s.interviewTypeLabel,
        interviewTypeColor: s.interviewTypeColor,
        selectedQuestions: s.selectedQuestions,
      }),
      migrate: (persisted, fromVersion) => {
        // 스키마가 바뀌어도 안전하게 기본값 채워주기
        const base = {
          isHydrated: true,
          step: STEPS.UPLOAD,
          interviewNo: "",
          title: "",
          interviewType: null,
          interviewTypeLabel: "",
          interviewTypeColor: "blue",
          selectedQuestions: [],
        };
        if (!persisted || typeof persisted !== "object") return base;
        if (fromVersion < 2) {
          // v1 → v2: 새 필드 추가
          return {
            ...base,
            ...persisted,
            interviewType: persisted.interviewType ?? null,
            interviewTypeLabel: persisted.interviewTypeLabel ?? "",
            interviewTypeColor: persisted.interviewTypeColor ?? "blue",
          };
        }
        return { ...base, ...persisted };
      },
      onRehydrateStorage: () => (state) => {
        // 복원 완료 플래그
        state?.setHydrated?.(true);
      },
    }
  )
);
