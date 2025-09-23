// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";

//async function enableMocking() {
//  if (!import.meta.env.DEV) return;
//  const { worker } = await import("./mocks/browser");
//  await worker.start({
//    onUnhandledRequest: "bypass", // 핸들러 없는 요청은 네트워크로 통과(경고 제거)
//  });
//}

//enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
          <AuthProvider>
      <App />
      </AuthProvider>
    </React.StrictMode>
  );
//});
