import { http, HttpResponse } from "msw";
import { userDB } from "./db/users";
import { API_PATHS } from "../utils/apiPaths";

export const authHandlers = [
  // 회원가입
  http.post(API_PATHS.AUTH.SIGNUP, async ({ request }) => {
    const { id, password, name } = await request.json();
    try {
      const user = userDB.add({ id, password, name });
      const token = userDB.issueToken(user.id);
      return HttpResponse.json({ token, user }, { status: 201 });
    } catch (e) {
      if (e.message === "DUPLICATE_ID") {
        return HttpResponse.json({ message: "이미 존재하는 ID" }, { status: 409 });
      }
      return HttpResponse.json({ message: "회원가입 실패" }, { status: 500 });
    }
  }),

  // 로그인
  http.post(API_PATHS.AUTH.LOGIN, async ({ request }) => {
    const { id, password } = await request.json();
    const user = userDB.validate(id, password);
    if (!user) {
      return HttpResponse.json({ message: "아이디/비밀번호 불일치" }, { status: 401 });
    }
    const token = userDB.issueToken(user.id);
    return HttpResponse.json({ token, user }, { status: 200 });
  }),

  // 내 정보
  http.get(API_PATHS.AUTH.ME, async ({ request }) => {
    const auth = request.headers.get("Authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return HttpResponse.json({ message: "토큰 없음" }, { status: 401 });

    const me = userDB.findByToken(token);
    if (!me) return HttpResponse.json({ message: "세션 만료" }, { status: 401 });

    return HttpResponse.json(me, { status: 200 });
  }),
];
