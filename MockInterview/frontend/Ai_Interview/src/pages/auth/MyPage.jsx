import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/Modal";
import api from "../../utils/axiosInstance";           // axios 인스턴스 (401 처리 포함)
import { useAuthStore } from "../../stores/authStore";
import { useLogout } from "../../hooks/useAuth"; 

const STORAGE_KEY = "ai-coach-profile";

/* ───── 업로드 직후 임시 질문 개수 저장소 (localStorage) ───── */
const PROV_Q_KEY = "ai-coach:provisional-question-counts";
const PROV_TTL_MS = 6 * 60 * 60 * 1000; // 6시간 후 자동 무시

function getProvisionalCounts() {
  try {
    const raw = localStorage.getItem(PROV_Q_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    // TTL 정리
    const now = Date.now();
    let changed = false;
    for (const k of Object.keys(obj)) {
      if (!obj[k]?.ts || now - obj[k].ts > PROV_TTL_MS) {
        delete obj[k];
        changed = true;
      }
    }
    if (changed) localStorage.setItem(PROV_Q_KEY, JSON.stringify(obj));
    return obj;
  } catch {
    return {};
  }
}
function setProvisionalCount(interviewId, count) {
  try {
    const obj = getProvisionalCounts();
    obj[interviewId] = { count: Number(count) || 0, ts: Date.now() };
    localStorage.setItem(PROV_Q_KEY, JSON.stringify(obj));
  } catch {}
}
function getProvisionalCountFor(interviewId) {
  const obj = getProvisionalCounts();
  return obj?.[interviewId]?.count ?? null;
}

const MyPage = () => {
  // ✅ AuthContext 제거 → Zustand로 대체
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isAuth = !!token;
  const doLogout = useLogout();

  const navigate = useNavigate();

  const [tab, setTab] = useState("실전 면접");
  const [profile, setProfile] = useState({ name: "", email: "" });

  // 서버에서 받아온 인터뷰 리스트
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 수정 모달 상태
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editProfile, setEditProfile] = useState(profile);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwNew2, setPwNew2] = useState("");
  const [formError, setFormError] = useState("");

  // 미로그인 가드 (ProtectedRoute가 있더라도 방어적)
  useEffect(() => {
    if (!isAuth) navigate("/login");
  }, [isAuth, navigate]);

  // 로그인 유저 + 로컬 저장값 병합 (좌측 카드)
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
      } catch {
        setProfile(base);
      }
    } else {
      setProfile(base);
    }
  }, [user]);

  // ✅ 백엔드 연동: /user/profile
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setErr("");
      try {
        const { data } = await api.get("/user/profile");
        // data: { name, email, interviews: [...] }
        setProfile((prev) => ({
          ...prev,
          name: data?.name || prev.name,
          email: data?.email || prev.email,
        }));

        const mapped = (data?.interviews || []).map((it) => {
          const startedAt = Date.parse(it.interview_date); // 숫자(밀리초) 저장
          const rawStatus = it.analysis_status || "";

          // ⚡️ 업로드 직후 임시 질문 개수(프론트 낙관적) 병합
          const provCount = getProvisionalCountFor(String(it.interview_no));
          const questionCount = (it.question_count ?? 0);
          const finalCount = questionCount > 0 ? questionCount : (provCount ?? 0);

          return {
            id: String(it.interview_no),
            title: it.interview_title,
            count: finalCount,                   // 👈 서버 0이면 임시값으로 대체
            date: formatKST(it.interview_date),  // 화면표기용(KST 문자열)
            startedAt,                           // 계산용(숫자)
            kind: it.interview_type,             // "실전 면접" | "모의 면접"
            statusText: rawStatus,               // 원상태(표시 시점에 덮어씌움)
            statusTone: rawStatus?.includes("중") ? "blue" : "green",
          };
        });
        setInterviews(mapped);
      } catch (e) {
        console.error(e);
        // ❗️401은 axios 인터셉터에서 clearAuth + /login 처리됨
        if (e?.response?.status !== 401) {
          setErr("프로필 정보를 불러오지 못했습니다.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (isAuth) fetchProfile();
  }, [isAuth]);

  // ✅ 현재 탭(실전/모의) 안에 질문 개수 0개 항목이 존재하는지 (안내문구 표시용)
  const hasZeroCount = useMemo(
    () => interviews.some((r) => r.kind === tab && (r.count ?? 0) === 0),
    [interviews, tab]
  );

  // ✅ 프론트에서 1시간 초과시 "분석 완료"로 강제 표기 + 질문 0개는 숨김
  const filtered = useMemo(() => {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;

    return interviews
      .map((r) => {
        const start = Number.isFinite(r.startedAt) ? r.startedAt : Date.parse(r.date);
        const over1h = Number.isFinite(start) && (now - start) > ONE_HOUR;

        if (r.statusText === "현재 분석 중" && over1h) {
          return { ...r, statusText: "분석 완료", statusTone: "green" }; // 화면 표기만 변경
        }
        return r;
      })
      .filter((r) => r.kind === tab && (r.count ?? 0) > 0); // 질문 개수 0개는 표시하지 않음
  }, [interviews, tab]);

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
      // 실제로는 api.post("/user/change-password", { current: pwCurrent, next: pwNew })
    }

    setProfile(editProfile);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(editProfile));
    setIsEditOpen(false);
  };

  // ✅ Context의 logout 대신 우리 훅 사용
  const handleLogout = () => {
    doLogout(); // 내부에서 clearAuth + queryClient.clear + /login 이동
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
            <button onClick={() => navigate("/")} className="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
              Home
            </button>
            <button onClick={handleLogout} className="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
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
                <button className="px-3 py-1.5 rounded-lg text-sm bg-white border border-gray-200 hover:bg-gray-50" onClick={openEdit}>
                  수정
                </button>
              </div>
            </section>

            {/* 최근 분석 요약(임시 고정 문구) */}
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
                  {tab} 분석 결과 <span className="text-blue-600">{filtered.length}</span>
                </h3>
                {/* ✅ 안내 문구: 현재 탭에 질문 0개 항목이 존재하면 표시 */}
                {hasZeroCount && (
                  <p className="mt-1 text-xs text-gray-500">
                    ※ 질문 개수가 없는 면접은 표시되지 않습니다.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm">
                {["실전 면접", "모의 면접"].map((name) => (
                  <button
                    key={name}
                    onClick={() => setTab(name)}
                    className={`px-3 py-1.5 rounded-lg border text-sm ${
                      tab === name ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* 테이블 */}
            <div className="mt-4 rounded-2xl border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="py-16 text-center text-sm text-gray-500">불러오는 중…</div>
              ) : err ? (
                <div className="py-16 text-center text-sm text-red-500">{err}</div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-500">표시할 항목이 없습니다.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <Th>면접 제목</Th>
                      <Th className="w-24 text-center">질문 개수</Th>
                      <Th className="w-28 text-center">분석 상태</Th>
                      <Th className="w-24 text-center">면접 종류</Th>
                      <Th className="w-40 text-right pr-6">면접 날짜</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/session/${item.id}/preview`, { state: { session: item } })}
                      >
                        <Td>
                          <span className="text-blue-600 text-[11px] mr-2">{item.kind}</span>
                          <span className="font-medium text-gray-900">Q. {item.title}</span>
                        </Td>
                        <Td className="text-center">{item.count}</Td>
                        <Td className="text-center">
                          <Badge tone={item.statusTone}>{item.statusText}</Badge>
                        </Td>
                        <Td className="text-center">{item.kind}</Td>
                        <Td className="text-right pr-6 text-gray-600">{item.date}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* ===== 프로필 편집 + 비밀번호 변경 모달 ===== */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="프로필 수정">
        <form onSubmit={handleSaveProfile} className="p-5 space-y-5">
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
            <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">
              취소
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm">
              저장
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MyPage;

/* ───── 테이블 유틸 ───── */
function Th({ children, className = "" }) {
  return <th className={`py-3 pl-4 pr-2 text-left font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`py-3 pl-4 pr-2 align-middle ${className}`}>{children}</td>;
}
function Badge({ children, tone = "gray" }) {
  const map = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    gray: "bg-gray-100 text-gray-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${map[tone]}`}>{children}</span>;
}

/* ───── 날짜 헬퍼(KST 표기) ───── */
function formatKST(isoLike) {
  try {
    const d = new Date(isoLike);
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${y}.${m}.${day} ${hh}:${mm}`;
  } catch {
    return isoLike ?? "";
  }
}
function pad(n) { return String(n).padStart(2, "0"); }
