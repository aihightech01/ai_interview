import MockAdapter from "axios-mock-adapter";
import api from "../utils/axiosInstance";
import { authHandlers } from "./authHandlers";
import { handlers } from "./handlers"; // 기존 질문/세션 핸들러

export default function attachMock() {
  const mock = new MockAdapter(api, { delayResponse: 300 });

  // 기존 handlers는 axios-mock-adapter 패턴이었는데,
  // authHandlers는 msw/http 스타일이라면, 하나로 맞춰야 해요.
  // 👉 axios-mock-adapter 기반으로 쓰고 싶으면 authHandlers도 수정해야 하고,
  // 👉 아니면 전부 msw/http 기반으로 바꾸는 게 더 일관적입니다.

  console.log("%c[Mock API attached]", "background:#000;color:#0f0");
  return mock;
}
