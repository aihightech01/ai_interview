// src/mocks/handlers.js
import { http, HttpResponse } from "msw";

export const handlers = [
  http.post("/api/user/login", async ({ request }) => {
    const { id, pw } = await request.json();
    if (id === "test" && pw === "1234") {
      return HttpResponse.json({ token: "fake-jwt-token" }, { status: 200 });
    }
    return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
  }),

  // 필요하면 회원가입/ME도 추가
  http.post("/api/user/register", async ({ request }) => {
    const { id, pw, name } = await request.json();
    return HttpResponse.json({ ok: true, user: { id, name } }, { status: 201 });
  }),
  http.get("/api/users/me", ({ request }) => {
    return HttpResponse.json({ id: "test", name: "은혜", role: "user" });
  }),

    // 감정 데이터
  http.get("/api/sessions/:id/emotions", ({ params }) => {
    return HttpResponse.json([
      { t: 0, valence: 0.1 },
      { t: 1, valence: -0.2 },
      { t: 2, valence: 0.3 },
      { t: 3, valence: 0.0 },
      { t: 4, valence: 0.5 },
    ]);
  }),

  // 자막 데이터
  http.get("/api/sessions/:id/transcript", ({ params }) => {
    return HttpResponse.json([
      { start: 0.5, end: 2.2, text: "안녕하세요, 저는 김은혜입니다." },
      { start: 2.5, end: 5.0, text: "AI 면접 코치를 소개하겠습니다." },
      { start: 5.2, end: 8.0, text: "영상과 그래프가 싱크됩니다." },
    ]);
  }),
];
