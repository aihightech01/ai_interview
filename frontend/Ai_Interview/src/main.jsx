// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./utils/queryClient";

// (선택) MSW를 쓰면 주석 해제해서 사용 가능
// async function enableMocking() {
//   if (!import.meta.env.DEV) return;
//   const { worker } = await import("./mocks/browser");
//   await worker.start({ onUnhandledRequest: "bypass" });
// }

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>

    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
