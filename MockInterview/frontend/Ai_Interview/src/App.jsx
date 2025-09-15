// src/App.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Login from "./pages/auth/Login";
import MyPage from "./pages/auth/MyPage";
import SignUp from "./pages/auth/SignUp";
import LandingPage from "./pages/LandingPage";
import SessionDetail from "./pages/Reports/SessionDetail";
import Dashboard from "./pages/Dashboard";

import { AuthProvider, useAuth } from "./context/AuthContext";

import InterviewProvider from "./context/InterviewProvider";
import Select from "./pages/interview/Select";
import ResumeUpload from "./pages/interview/ResumeUpload";
import QuestionList from "./pages/interview/QuestionList";
import DeviceTest from "./pages/interview/DeviceTest";
import Interview from "./pages/interview/Interview";
import Loading from "./pages/interview/Loading";
import Calibration from "./pages/interview/Calibration";

/** ✅ 같은 파일에 보호 컴포넌트 정의 (폴더/파일 추가 없음) */
const RequireAuth = ({ children }) => {
  const { isAuth, loading, user } = useAuth(); // loading 없으면 무시돼도 OK
  const location = useLocation();

  // (선택) 로딩 중엔 깜빡임 방지용 플레이스홀더
  if (typeof loading !== "undefined" && loading) {
    return <div className="h-14" />; // 스켈레톤/스피너로 바꿔도 됨
  }

  if (!isAuth) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          message: "로그인 후 이용 가능합니다.",
          from: location.pathname + location.search,
        }}
      />
    );
  }

  // (선택) 로그인은 됐지만 user가 아직 없다면 대기
  if (isAuth && user === null) {
    return <div className="h-14" />;
  }

  return children;
};

const App = () => {
  return (
    <div>
      <AuthProvider>
        <Router>
          <InterviewProvider>
            <Routes>
              {/* 🔓 공개 라우트 */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />

              {/* 🔒 보호 라우트 (로그인 필요) */}
              <Route
                path="/mypage"
                element={
                  <RequireAuth>
                    <MyPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/session/:id"
                element={
                  <RequireAuth>
                    <SessionDetail />
                  </RequireAuth>
                }
              />

              {/* 🔒 인터뷰 플로우도 보호 */}
              <Route
                path="/interview/calibration"
                element={
                  <RequireAuth>
                    <Calibration />
                  </RequireAuth>
                }
              />
              <Route
                path="/interview/select"
                element={
                  <RequireAuth>
                    <Select />
                  </RequireAuth>
                }
              />
              <Route
                path="/interview/resume"
                element={
                  <RequireAuth>
                    <ResumeUpload />
                  </RequireAuth>
                }
              />
              <Route
                path="/interview/questions"
                element={
                  <RequireAuth>
                    <QuestionList />
                  </RequireAuth>
                }
              />
              <Route
                path="/interview/devices"
                element={
                  <RequireAuth>
                    <DeviceTest />
                  </RequireAuth>
                }
              />
              <Route
                path="/interview/run/:sessionId?"
                element={
                  <RequireAuth>
                    <Interview />
                  </RequireAuth>
                }
              />
              <Route
                path="/interview/loading/:sessionId"
                element={
                  <RequireAuth>
                    <Loading />
                  </RequireAuth>
                }
              />
            </Routes>
          </InterviewProvider>
        </Router>
      </AuthProvider>

      <Toaster
        toastOptions={{
          className: "",
          style: { fontSize: "13px" },
        }}
      />
    </div>
  );
};

export default App;
