
import MockAdapter from "axios-mock-adapter";
import api from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import { nanoid } from "nanoid";

const db = {
  questions: {
    COMMON: [
      { questionId: "c1", source: "COMMON", text: "자기소개를 해주세요." },
      { questionId: "c2", source: "COMMON", text: "지원 동기는 무엇인가요?" },
      { questionId: "c3", source: "COMMON", text: "최근 성취 사례를 말해보세요." },
    ],
    RESUME: [],
    CUSTOM: [],
  },
  sessions: {},   // sessionId -> {sessionId, questionIds, medias: {qid: mediaId}}
  medias: {},     // mediaId -> {durationSec}
  analyses: {},   // analysisId -> {status, progress, sessionId}
};

function persist() {
  try { localStorage.setItem("__mockdb__", JSON.stringify(db)); } catch {}
}
function load() {
  try {
    const raw = localStorage.getItem("__mockdb__");
    if (raw) Object.assign(db, JSON.parse(raw));
  } catch (err) {
    console.warn("[mock] failed to load persisted db:", err);
  }
}
load();

function seedQuestionsIfEmpty() {
  db.questions = db.questions || {};
  db.questions.COMMON = db.questions.COMMON || [];
  db.questions.RESUME = db.questions.RESUME || [];
  db.questions.CUSTOM = db.questions.CUSTOM || [];

  const make10 = (key, prefix) => {
    if (db.questions[key].length === 0) {
      db.questions[key] = Array.from({ length: 10 }).map((_, i) => ({
        questionId: nanoid(),
        source: key,
        text: `질문 ${i + 1}. ${prefix} 경험을 STAR 기법으로 설명해보세요.`,
      }));
    }
  };

  make10("COMMON", "직무 연관 프로젝트");
  make10("RESUME", "자소서 기반 프로젝트");
  persist();
}
seedQuestionsIfEmpty();

export default function attachMock() {
  const mock = new MockAdapter(api, { delayResponse: 300 });

  // 1) 질문 조회 (GET /questions?source=...&limit=...)
  mock.onGet(new RegExp(`${API_PATHS.QUESTIONS}.*`)).reply((cfg) => {
    const url = new URL(cfg.url, "http://x");
    const src = url.searchParams.get("source") || "COMMON";
    const list = db.questions[src] || [];

    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.min(list.length, Number(limitParam)) : list.length;

    return [200, list.slice(0, limit)];
  });

  // 2) 커스텀 질문 CRUD
  mock.onGet(API_PATHS.CUSTOM_QUESTIONS).reply(200, db.questions.CUSTOM);
  mock.onPost(API_PATHS.CUSTOM_QUESTIONS).reply((cfg) => {
    const { text } = JSON.parse(cfg.data || "{}");
    const q = { questionId: nanoid(), source: "CUSTOM", text };
    db.questions.CUSTOM.unshift(q);
    persist();
    return [201, q];
  });
  mock.onDelete(new RegExp(`^${API_PATHS.CUSTOM_QUESTIONS}/[^/]+$`)).reply((cfg) => {
    const id = cfg.url.split("/").pop();
    db.questions.CUSTOM = (db.questions.CUSTOM || []).filter(q => q.questionId !== id);
    persist();
    return [204];
  });

  // 3) 자소서 업로드/텍스트 → resumeId 반환
  mock.onPost(API_PATHS.RESUME.TEXT).reply((cfg) => {
    const resumeId = nanoid();
    const body = JSON.parse(cfg.data || "{}");
    persist();
    return [200, { resumeId, pages: 1, extractedText: body.text || "" }];
  });
  mock.onPost(API_PATHS.RESUME.UPLOAD).reply(200, {
    resumeId: nanoid(),
    pages: 1,
    extractedText: "",
  });

  // 4) 자소서 기반 질문 생성
  mock.onPost(API_PATHS.RESUME.FROM_RESUME).reply((cfg) => {
    const { topK = 10 } = JSON.parse(cfg.data || "{}");
    const made = Array.from({ length: Math.min(topK, 5) }).map((_, i) => ({
      questionId: nanoid(),
      source: "RESUME",
      text: `자소서 기반 질문 #${i + 1}`,
    }));
    db.questions.RESUME = made.concat(db.questions.RESUME);
    persist();
    return [200, made];
  });

  // 5) 면접 세션 생성
  mock.onPost(API_PATHS.INTERVIEWS).reply((cfg) => {
    const { questionIds = [] } = JSON.parse(cfg.data || "{}");
    const sessionId = nanoid();
    db.sessions[sessionId] = { sessionId, questionIds, medias: {} };
    persist();
    return [201, {
      sessionId,
      questionIds,
      status: "CREATED",
      createdAt: new Date().toISOString(),
    }];
  });

  // 6) 업로드 티켓 발급
  mock.onPost(API_PATHS.MEDIA.TICKET).reply((cfg) => {
    const { sessionId, questionId, contentType } = JSON.parse(cfg.data || "{}");
    const s = db.sessions[sessionId];
    if (!s) return [404, { error: { code: "SESSION_NOT_FOUND", message: "Invalid sessionId" } }];
    if (!s.questionIds.includes(questionId)) {
      return [400, { error: { code: "QUESTION_NOT_IN_SESSION", message: "Invalid questionId for this session" } }];
    }
    if (!contentType) {
      return [400, { error: { code: "INVALID_CONTENT_TYPE", message: "contentType required" } }];
    }
    const mediaId = nanoid();
    return [200, {
      mediaId,
      uploadUrl: `mock://upload/${mediaId}`,
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      contentType,
    }];
  });

  // 7) 업로드 확인(confirm)
  mock.onPost(API_PATHS.MEDIA.CONFIRM).reply((cfg) => {
    const { mediaId, sessionId, questionId, durationSec } = JSON.parse(cfg.data || "{}");
    const s = db.sessions[sessionId];
    if (!s) return [404, { error: { code: "SESSION_NOT_FOUND", message: "Invalid sessionId" } }];
    if (!s.questionIds.includes(questionId)) {
      return [400, { error: { code: "QUESTION_NOT_IN_SESSION", message: "Invalid questionId for this session" } }];
    }
    db.medias[mediaId] = { durationSec: Number(durationSec) || 0 };
    s.medias[questionId] = mediaId;
    persist();
    return [201, { ok: true }];
  });

  // 8) 분석 생성/상태/요약
  mock.onPost(API_PATHS.ANALYSIS.CREATE).reply((cfg) => {
    const { sessionId } = JSON.parse(cfg.data || "{}");
    if (!db.sessions[sessionId]) {
      return [404, { error: { code: "SESSION_NOT_FOUND", message: "Invalid sessionId" } }];
    }
    const analysisId = nanoid();
    db.analyses[analysisId] = { analysisId, sessionId, status: "QUEUED", progress: 0 };
    const timer = setInterval(() => {
      const a = db.analyses[analysisId];
      if (!a) return clearInterval(timer);
      a.progress = Math.min(100, a.progress + 20);
      if (a.progress >= 100) {
        a.status = "DONE";
        clearInterval(timer);
        persist();
      }
      persist();
    }, 800);
    persist();
    return [200, { analysisId, sessionId, status: "QUEUED", progress: 0 }];
  });

  mock.onGet(/\/analysis\/[^/]+\/status$/).reply((cfg) => {
    const parts = cfg.url.split("/");
    const id = parts[parts.length - 2];
    const a = db.analyses[id] || { status: "FAILED", progress: 0 };
    return [200, a];
  });

  mock.onGet(/\/analysis\/[^/]+\/summary$/).reply(200, {
    overall: { passLikelihood: 0.37, readiness: "MID", comments: ["시선 안정적", "속도 약간 빠름"] },
    signals: { gaze: "STABLE", speechRate: "FAST", emotionVariance: "LOW" },
  });

  console.log("%c[Mock API attached]", "background:#000;color:#0f0");
  return mock;
}
