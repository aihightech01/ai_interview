import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast"
import Login from "./pages/auth/Login"
import MyPage from "./pages/auth/MyPage";
import SignUp from "./pages/auth/SignUp";
import LandingPage from "./pages/LandingPage";
import SessionDetail from "./pages/Reports/SessionDetail";
import SessionPreview from "./pages/Reports/SessionPreview";
import Dashboard from "./pages/Dashboard";
import { AuthProvider } from "./context/AuthContext";

import InterviewProvider from "./context/InterviewProvider";
import Select from "./pages/interview/Select";
import ResumeUpload from "./pages/interview/ResumeUpload";
import QuestionList from "./pages/interview/QuestionList";
import DeviceTest from "./pages/interview/DeviceTest";
import Interview from "./pages/interview/Interview";
import Loading from "./pages/interview/Loading";
import Calibration from "./pages/interview/Calibration";
import ProfileClipsPage from "./pages/Debug/ProfileClipsPage"; //✅ 임시 새 페이지




const App = () => {
  return (
    <div >
      <AuthProvider>
        <Router>
          <InterviewProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/mypage" element={<MyPage />} />

              <Route path="/session/:sessionId/preview" element={<SessionPreview />} />
              <Route path="/sessionDetail" element={<SessionDetail />} />
              <Route path="/dashboard" element={<Dashboard />} />

              <Route path="/interview/calibration" element={<Calibration />} />
              <Route path="/interview/select" element={<Select />} />
              <Route path="/interview/resume" element={<ResumeUpload />} />
              <Route path="/interview/questions" element={<QuestionList />} />
              <Route path="/interview/devices" element={<DeviceTest />} />
              <Route path="/interview/run/:sessionId?" element={<Interview />} />
              <Route path="/interview/loading/:sessionId" element={<Loading />} />
                <Route path="/debug/profile/:interviewNo" element={<ProfileClipsPage />} />
            </Routes>
          </InterviewProvider>
        </Router>
      </AuthProvider>
      <Toaster
        toastOptions={{
          className: "",
          style: {
            fontSize: "13px",
          },
        }}
      />

    </div>
  );
};

export default App