// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Login from "./pages/auth/Login";
import MyPage from "./pages/auth/MyPage";
import SignUp from "./pages/auth/SignUp";
import LandingPage from "./pages/LandingPage";
import SessionDetail from "./pages/Reports/SessionDetail";
import SessionPreview from "./pages/Reports/SessionPreview";


import InterviewProvider from "./context/InterviewProvider";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./utils/queryClient.js";

import Select from "./pages/interview/Select";
import ResumeUpload from "./pages/interview/ResumeUpload";
import QuestionList from "./pages/interview/QuestionList";
import DeviceTest from "./pages/interview/DeviceTest";
import Interview from "./pages/interview/Interview";
import Loading from "./pages/interview/Loading";
import Calibration from "./pages/interview/Calibration";

import ProtectedRoute from "./routes/ProtectedRoute";

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-600">
      404 · 페이지를 찾을 수 없어요
    </div>
  );
}

const App = () => {
  return (
    <div>
      {/* AuthProvider 삭제 */}
      <QueryClientProvider client={queryClient}>
        <Router>
          <InterviewProvider>
            <Routes>
              {/* 공개 */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />

              {/* 보호 */}
              <Route element={<ProtectedRoute />}>
                <Route path="/mypage" element={<MyPage />} />
                <Route path="/session/:sessionId/preview" element={<SessionPreview />} />
                <Route path="/session/:sessionId/:videoNo" element={<SessionDetail />} />
              </Route>

              {/* 인터뷰 플로우 (필요하면 보호로 이동) */}
              <Route path="/interview/calibration" element={<Calibration />} />
              <Route path="/interview/select" element={<Select />} />
              <Route path="/interview/resume" element={<ResumeUpload />} />
              <Route path="/interview/questions" element={<QuestionList />} />
              <Route path="/interview/devices" element={<DeviceTest />} />
              <Route path="/interview/run/:sessionId?" element={<Interview />} />
              <Route path="/interview/loading/:sessionId" element={<Loading />} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </InterviewProvider>
        </Router>
      </QueryClientProvider>

      <Toaster toastOptions={{ style: { fontSize: "13px" } }} />
    </div>
  );
};

export default App;
