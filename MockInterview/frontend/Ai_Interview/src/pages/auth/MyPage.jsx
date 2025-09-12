// src/pages/Auth/MyPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/Modal";
import { useAuth } from "../../context/AuthContext";

// --- 더미 카드 데이터 ---
const MOCK_RESULTS = [
  { id: 1, title: "자기소개 장점 (강점)은 무엇입니까?", date: "2024.02.27 15:58", kind: "실전 면접", duration: "00:33", status: "analyzing", tone: "dark" },
  { id: 2, title: "프로젝트에서 맡은 역할은?", date: "2024.02.27 15:58", kind: "실전 면접", duration: "00:33", status: "done", tone: "blue" },
  { id: 3, title: "리더십을 발휘한 경험", date: "2024.02.27 15:58", kind: "실전 면접", duration: "00:33", status: "done", tone: "blue" },
  { id: 4, title: "갈등 상황 해결 사례", date: "2024.02.27 15:58", kind: "실전 면접", duration: "00:33", status: "done", tone: "blue" },
  { id: 5, title: "자기소개 장점 (강점)은 무엇입니까?", date: "2024.02.27 15:58", kind: "실전 면접", duration: "00:33", status: "done", tone: "none" },
  { id: 6, title: "자기소개 장점 (강점)은 무엇입니까?", date: "2024.02.27 15:58", kind: "실전 면접", duration: "00:33", status: "done", tone: "none" },
  { id: 7, title: "자기소개 장점 (강점)은 무엇입니까?", date: "2024.02.27 15:58", kind: "실전 면접", duration: "00:33", status: "done", tone: "pink" },
  { id: 8, title: "자기소개 장점 (강점)은 무엇입니까?", date: "2024.02.27 15:58", kind: "실전 면접", duration: "00:33", status: "done", tone: "pink" },
];

const toneClass = (tone) => {
  switch (tone) {
    case "dark": return "bg-[#0E1320] text-white";
    case "blue": return "bg-[#EAF1FF]";
    case "pink": return "bg-[#FFE9EB]";
    default: return "bg-[#EEF2F7]";
  }
};

const STORAGE_KEY = "ai-coach-profile";

const MyPage = () => {
  const { user, isAuth, logout } = useAuth();
  const [tab, setTab] = useState("실전 면접");

  // 화면에 보여줄 프로필
  const [profile, setProfile] = useState({
    name: "",
    email: "",
  });

  // 수정 모달
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editProfile, setEditProfile] = useState(profile);

  // 비밀번호 변경
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwNew2, setPwNew2] = useState("");
  const [formError, setFormError] = useState("");

  const navigate = useNavigate();

  // 인증되지 않은 경우 로그인 페이지로
  useEffect(() => {
    if (!isAuth) {
      navigate("/login");
    }
  }, [isAuth, navigate]);

  // 로그인 유저 + 로컬 저장값 병합
  useEffect(() => {
    const base = {
      name: user?.name || user?.loginId || "",
      email: user?.email || "",
    };
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile({ ...base, ...parsed });
      } catch (e) {
        console.warn("profile parse error", e);
        setProfile(base);
      }
    } else {
      setProfile(base);
    }
  }, [user]);

  const openEdit = () => {
    setEditProfile(profile);
    setPwCurrent("");
    setPwNew("");
    setPwNew2("");
    setFormError("");
    setIsEditOpen(true);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setFormError("");

    if (!editProfile.name?.trim()) return setFormError("이름을 입력해 주세요.");
    if (!/^\S+@\S+\.\S+$/.test(editProfile.email || "")) return setFormError("올바른 이메일 주소를 입력해 주세요.");

    const wantsPwChange = pwCurrent || pwNew || pwNew2;
    if (wantsPwChange) {
      if (!pwCurrent) return setFormError("현재 비밀번호를 입력해 주세요.");
      if (!pwNew || pwNew.length < 8) return setFormError("새 비밀번호는 8자 이상이어야 합니다.");
      if (pwNew !== pwNew2) return setFormError("새 비밀번호가 일치하지 않습니다.");
      alert("비밀번호가 변경되었습니다. (데모)");
    }

    setProfile(editProfile);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(editProfile));
    setIsEditOpen(false);
  };

  const handleLogout = () => {
    try { localStorage.removeItem("token"); } catch {}
    logout?.();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="font-semibold text-gray-900" aria-label="홈으로">
            AI 면접 코치
          </button>
          <nav className="flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              className="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
            >
              Home
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
            >
              로그아웃
            </button>
          </nav>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
          {/* 프로필 + 최근 분석 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 프로필 카드 */}
            <section className="md:col-span-1 rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-gray-100 border" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{profile.name} 님</p>
                  <p className="text-xs text-gray-500">{profile.email}</p>
                </div>
                <button
                  className="px-3 py-1.5 rounded-lg text-sm bg-white border border-gray-200 hover:bg-gray-50"
                  onClick={openEdit}
                >
                  수정
                </button>
              </div>
            </section>

            {/* 최근 분석 요약 */}
            <section className="md:col-span-2 rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-medium text-gray-700">가장 최근 분석 요약</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                시선 흔들림과 말 속도가 빠름. 구조화(서론–본론–결론) 예시 추가 필요. 톤/볼륨은 양호.
              </p>
            </section>
          </div>

          {/* 분석 결과 + 탭 */}
          <section className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700">
                  실전 면접 분석 결과 <span className="text-blue-600">12</span>
                </h3>
                <p className="text-[11px] text-gray-400 mt-1">2024.2.27</p>
              </div>

              <div className="flex items-center gap-2 text-sm">
                {["실전 면접", "모의 면접"].map((name) => (
                  <button
                    key={name}
                    onClick={() => setTab(name)}
                    className={`px-3 py-1.5 rounded-lg border text-sm ${
                      tab === name
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* 카드 그리드 */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {MOCK_RESULTS.map((item) => (
                <article
                  key={item.id}
                  className="cursor-pointer rounded-2xl border border-gray-200 overflow-hidden bg-white hover:shadow"
                  onClick={() => navigate(`/session/${item.id}`, { state: { session: item } })}
                  aria-label={`${item.title} 상세 보기`}
                >
                  <div className={`relative h-36 ${toneClass(item.tone)}`}>
                    {item.status === "analyzing" && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                        <span className="text-[13px] opacity-90">현재 분석 중</span>
                        <span className="text-[11px] opacity-60">5분 이내 완료됩니다.</span>
                      </div>
                    )}
                    <span className="absolute left-2 top-2 text-[11px] rounded-md bg-white/80 border border-white px-2 py-0.5 text-gray-600">
                      {item.kind}
                    </span>
                    <span className="absolute right-2 bottom-2 text-[11px] rounded-full bg-black/80 text-white px-2 py-0.5">
                      {item.duration}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] text-blue-600">실전 면접</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 line-clamp-2">Q. {item.title}</p>
                    <p className="mt-1 text-[11px] text-gray-500">{item.date}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* ===== 프로필 편집 + 비밀번호 변경 모달 ===== */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="프로필 수정">
        <form onSubmit={handleSaveProfile} className="p-5 space-y-5">
          {/* 프로필 수정 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">이름</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                value={editProfile.name}
                onChange={(e) => setEditProfile((p) => ({ ...p, name: e.target.value }))}
                placeholder="이름을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">이메일</label>
              <input
                type="email"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                value={editProfile.email}
                onChange={(e) => setEditProfile((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* 비밀번호 변경 (선택) */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-800">비밀번호 변경 (선택)</p>
            <p className="text-xs text-gray-500">변경하지 않으려면 아래 입력란을 비워 두세요.</p>

            <div>
              <label className="block text-sm text-gray-700 mb-1">현재 비밀번호</label>
              <input
                type="password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                placeholder="현재 비밀번호"
                autoComplete="current-password"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">새 비밀번호</label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  placeholder="8자 이상"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">새 비밀번호 확인</label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                  value={pwNew2}
                  onChange={(e) => setPwNew2(e.target.value)}
                  placeholder="다시 입력"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
            >
              저장
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MyPage;
