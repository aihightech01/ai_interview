// src/mocks/handlers.js
import { http, HttpResponse } from "msw";

/* -------------------- Seed Data -------------------- */
const commonQs = [
  { questionId: 1, text: "자기소개를 해주세요.", source: "COMMON" },
  { questionId: 2, text: "우리 회사에 지원한 이유는 무엇인가요?", source: "COMMON" },
  { questionId: 3, text: "최근에 해결한 어려운 문제 하나를 설명해주세요.", source: "COMMON" },
];

const resumeQs = [
  { questionId: 11, text: "이력서의 프로젝트 A에서 맡은 역할은?", source: "RESUME" },
  { questionId: 12, text: "프로젝트 B의 성과와 본인 기여를 설명해주세요.", source: "RESUME" },
  { questionId: 13, text: "이 경험이 해당 직무에 어떻게 연결되나요?", source: "RESUME" },
];

let seq = 100; // 커스텀 질문 id 시퀀스
let customQs = [
  { questionId: ++seq, text: "입사 후 90일 동안 무엇을 하실 건가요?", source: "CUSTOM" },
];

/* -------------------- Handlers -------------------- */
export const handlers = [
  // 로그인
  http.post("/api/user/login", async ({ request }) => {
    const { id, pw } = await request.json();
    if (id === "test" && pw === "1234") {
      return HttpResponse.json({ token: "fake-jwt-token" }, { status: 200 });
    }
    return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
  }),

  // 회원가입
  http.post("/api/user/register", async ({ request }) => {
    const { id, pw, name } = await request.json();
    return HttpResponse.json({ ok: true, user: { id, name } }, { status: 201 });
  }),

  // 내 정보
  http.get("/api/users/me", () => {
    return HttpResponse.json({ id: "test", name: "은혜", role: "user" });
  }),

  // 감정 데이터
  http.get("/api/sessions/:id/emotions", () => {
    return HttpResponse.json([
      { t: 0, valence: 0.1 },
      { t: 1, valence: -0.2 },
      { t: 2, valence: 0.3 },
      { t: 3, valence: 0.0 },
      { t: 4, valence: 0.5 },
    ]);
  }),

  // 자막 데이터
  http.get("/api/sessions/:id/transcript", () => {
    return HttpResponse.json([
      { start: 0.5, end: 2.2, text: "안녕하세요, 저는 김은혜입니다." },
      { start: 2.5, end: 5.0, text: "AI 면접 코치를 소개하겠습니다." },
      { start: 5.2, end: 8.0, text: "영상과 그래프가 싱크됩니다." },
    ]);
  }),

  // 질문 목록 (COMMON | RESUME)
  http.get("/api/questions", ({ request }) => {
    const url = new URL(request.url);
    const source = (url.searchParams.get("source") || "COMMON").toUpperCase();
    const limit = Number(url.searchParams.get("limit") || 50);

    let data = [];
    if (source === "COMMON") data = commonQs;
    else if (source === "RESUME") data = resumeQs;

    return HttpResponse.json(data.slice(0, limit), { status: 200 });
  }),

  // 커스텀 질문 목록
  http.get("/api/custom-questions", () => {
    return HttpResponse.json(customQs, { status: 200 });
  }),

  // 커스텀 질문 추가
  http.post("/api/custom-questions", async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    const text = (body?.text || "").toString().trim();
    if (!text) {
      return HttpResponse.json({ message: "text is required" }, { status: 400 });
    }
    const item = { questionId: ++seq, text, source: "CUSTOM" };
    customQs = [item, ...customQs];
    return HttpResponse.json(item, { status: 201 });
  }),

  // 커스텀 질문 삭제
  http.delete("/api/custom-questions/:questionId", ({ params }) => {
    const id = Number(params.questionId);
    const exists = customQs.some((q) => q.questionId === id);
    if (!exists) {
      return HttpResponse.json({ message: "not found" }, { status: 404 });
    }
    customQs = customQs.filter((q) => q.questionId !== id);
    return HttpResponse.json({ ok: true }, { status: 200 });
  }),

  // 면접 세션 생성
  http.post("/api/interviews", async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    const questionIds = Array.isArray(body?.questionIds) ? body.questionIds : [];
    if (questionIds.length === 0) {
      return HttpResponse.json({ message: "questionIds required" }, { status: 400 });
    }
    const sessionId = `sess_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    return HttpResponse.json({ sessionId }, { status: 201 });
  }),
];
