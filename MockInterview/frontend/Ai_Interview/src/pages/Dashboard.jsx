import React from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "20px" }}>
      {/* 제목 */}
      <h1>대시보드</h1>

      {/* 환영 메시지 */}
      <p>로그인에 성공하셨습니다 🎉</p>

      {/* 샘플 메뉴 */}
      <ul>
        <li>내 정보 보기</li>
        <li>설정</li>
        <li>로그아웃</li>
      </ul>

      {/* LandingPage 이동 버튼 */}
      <button
        onClick={() => navigate("/")}
        style={{
          marginTop: "20px",
          padding: "10px 16px",
          borderRadius: "8px",
          backgroundColor: "#2563eb",
          color: "white",
          border: "none",
          cursor: "pointer",
        }}
      >
        메인으로 돌아가기
      </button>
    </div>
  );
};

export default Dashboard;
