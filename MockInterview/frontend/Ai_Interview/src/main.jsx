/* // src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

async function enableMocking() {
  if (!import.meta.env.DEV) return;
  const { worker } = await import("./mocks/browser");
  await worker.start({
    onUnhandledRequest: "bypass", // 핸들러 없는 요청은 네트워크로 통과(경고 제거)
  });
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
 */

// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

/**
 * 개발 중 MSW/서비스워커가 남아 있으면 네트워크를 가로챌 수 있어요.
 * 아래 코드는 등록된 모든 서비스워커를 해제합니다. (개발용)
 */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((reg) => reg.unregister()))
    .catch(() => {});
}

/**
 * ⚠️ MSW를 다시 쓰고 싶다면, 아래처럼 환경변수로 제어하세요.
 * .env: VITE_USE_MSW=true 일 때만 켜짐
 *
 * if (import.meta.env.VITE_USE_MSW === "true") {
 *   const { worker } = await import("./mocks/browser");
 *   await worker.start({ onUnhandledRequest: "bypass" });
 * }
 */

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

