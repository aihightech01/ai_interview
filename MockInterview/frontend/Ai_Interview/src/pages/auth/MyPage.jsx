import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/Modal";
import api from "../../utils/axiosInstance";           // axios 인스턴스 (401 처리 포함)
import { useAuthStore } from "../../stores/authStore";
import { useLogout } from "../../hooks/useAuth";
import DefaultAvatar from "../../components/DefaultAvatar";

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
  const [profile, setProfile] = useState({ name: "", email: "", avatarUrl: "", overallcompare: "" });

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
      avatarUrl: user?.avatarUrl || "",   // Zustand user에 있으면 사용
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
        // data: { name, email, avatarUrl?, interviews: [...] }
        setProfile((prev) => ({
          ...prev,
          name: data?.name || prev.name,
          email: data?.email || prev.email,
          avatarUrl: data?.avatarUrl || prev.avatarUrl,
          overallcompare: data?.overallcompare || prev.overallcompare
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

  // 🔍 숨김(질문 0개) 항목은 콘솔로만 알림
  useEffect(() => {
    const hidden = interviews.filter((r) => r.kind === tab && (r.count ?? 0) === 0);
    if (hidden.length > 0) {
      console.log(
        `[MyPage] 숨김 처리된 면접(질문 0개): count=${hidden.length}`,
        hidden.map((h) => ({ id: h.id, title: h.title, kind: h.kind, date: h.date }))
      );
    }
  }, [interviews, tab]);

  // 이니셜 (아바타 대체)
  const initials = useMemo(() => {
    const base = (profile.name || profile.email || "U").trim();
    if (!base) return "U";
    const parts = base.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    const first = base.slice(0, 2);
    return /[A-Za-z]/.test(first) ? first.toUpperCase() : first;
  }, [profile.name, profile.email]);

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

  /* ───── 주(월~일) 단위 grouping ───── */

  // 날짜/주 헬퍼들
  function toDateObj(tsOrStr) {
    return new Date(typeof tsOrStr === "number" ? tsOrStr : Date.parse(tsOrStr));
  }
  // 해당 날짜의 "주 시작(월요일 00:00)" 반환
  function startOfWeekKST(d) {
    const date = new Date(d);
    const day = date.getDay(); // 0=일,1=월,...6=토
    const diffToMonday = (day === 0 ? -6 : 1 - day); // 일요일이면 -6, 월=0, 화=-1 ...
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + diffToMonday);
    return start;
  }
  // "주 끝(일요일 23:59:59.999)" 반환
  function endOfWeekKST(d) {
    const start = startOfWeekKST(d);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }
  function formatYMD(d) {
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    return `${y}.${m}.${day}`;
  }
  // 그룹 key는 "주 시작일" 문자열로
  function weekKeyOf(d) {
    return formatYMD(startOfWeekKST(d));
  }
  function weekLabelOf(d) {
    const s = startOfWeekKST(d);
    const e = endOfWeekKST(d);
    return `${formatYMD(s)} ~ ${formatYMD(e)}`;
  }

  // ✅ 주 단위 그룹
  const weekGroups = useMemo(() => {
    const map = new Map(); // key: "YYYY.MM.DD(월)" → items[]
    filtered.forEach((it) => {
      const basis = toDateObj(it.startedAt || it.date);
      const key = weekKeyOf(basis);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    });

    // 각 그룹 내부: 최신순 정렬
    for (const [, arr] of map) {
      arr.sort((a, b) => (b.startedAt || Date.parse(b.date)) - (a.startedAt || Date.parse(a.date)));
    }

    // 그룹 자체도 최신 주가 위로
    const groups = [...map.entries()]
      .sort((a, b) => Date.parse(b[0]) - Date.parse(a[0]))
      .map(([key, items]) => {
        const anyDate = toDateObj(items[0].startedAt || items[0].date);
        return {
          key,
          label: weekLabelOf(anyDate),
          items,
        };
      });

    return groups;
  }, [filtered]);

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_80%_-10%,#e0f2fe_10%,transparent_60%),radial-gradient(1000px_500px_at_0%_0%,#f3e8ff_10%,transparent_60%)]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-100/80 backdrop-blur bg-white/70">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="group inline-flex items-center gap-2 font-semibold text-gray-900"
            aria-label="홈으로"
          >
            <span>AI 면접 코치</span>
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
        <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
          {/* 프로필 + 최근 분석 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 프로필 카드 */}
            <section className="relative md:col-span-1 rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              {/* 상단 색띠 */}
              <div className="h-16 bg-[linear-gradient(135deg,#eff6ff,35%,#ecfeff,70%,#f5f3ff)]" />
              <div className="p-5 pt-3">
                <div className="flex items-start gap-5 -mt-10">
                  {/* 아바타 */}
                  <div className="h-22 w-20 rounded-2xl overflow-hidden border border-white shadow-sm bg-gray-50 grid place-items-center ring-1 ring-gray-100">
                    <DefaultAvatar size={64} className="text-gray-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-gray-900">{profile.name || "이름 미설정"} 님</p>
                    <p className="truncate text-xs text-gray-500">{profile.email || "—"}</p>

                    <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/60 px-2.5 py-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[11px] text-gray-600">로그인 상태</span>
                    </div>
                  </div>

                  <button
                    className="px-3 py-1.5 rounded-lg text-sm bg-white border border-gray-200 hover:bg-gray-50 shadow-sm"
                    onClick={openEdit}
                  >
                    수정
                  </button>
                </div>
              </div>
            </section>

            {/* 최근 분석 요약 — 심플 콜아웃 업그레이드 */}
            <section className="md:col-span-2 rounded-2xl bg-white border border-gray-200 shadow-sm">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">가장 최근 분석 요약</h3>
                  {/* 작은 메타 배지 */}
                  <span className="inline-flex items-center rounded-md border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600">
                    요약
                  </span>
                </div>

                {/* 좌측 라인 + 아주 옅은 배경으로 가독성만 살림 */}
                <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white border border-gray-200">
                      <span className="text-[12px]">📊</span>
                    </div>
                    <p className="flex-1 text-[13px] leading-6 text-gray-700 whitespace-pre-wrap">
                      {profile.overallcompare || "최근 분석 요약이 아직 없습니다."}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* 분석 결과 + 탭 */}
          <section className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">
                  {tab} 분석 결과{" "}
                  <span className="ml-1 inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-0.5 text-blue-700">
                    {filtered.length}
                  </span>
                </h3>
              </div>

              {/* Segmented Tabs */}
              <div
                className="inline-flex rounded-xl border border-gray-200 bg-gray-50/60 p-1 overflow-hidden"
                role="tablist"
                aria-label="면접 종류 선택"
              >
                {["실전 면접", "모의 면접"].map((name) => (
                  <button
                    key={name}
                    onClick={() => setTab(name)}
                    role="tab"
                    aria-selected={tab === name}
                    className={`px-3.5 py-1.5 text-sm rounded-lg transition
                    ${tab === name
                      ? "bg-white shadow-sm border border-gray-200 text-blue-700"
                      : "text-gray-700 hover:bg-white/60"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-[12px]">{name === "실전 면접" ? "⚡" : "🎯"}</span>
                      {name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 주 단위 섹션 테이블 */}
            <div className="mt-5 space-y-6">
              {loading ? (
                <div className="py-16 text-center text-sm text-gray-600">
                  <div className="mx-auto mb-3 h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
                  불러오는 중…
                </div>
              ) : err ? (
                <div className="py-16 text-center text-sm text-red-500">{err}</div>
              ) : weekGroups.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-600">
                  <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">🗂️</div>
                  표시할 항목이 없습니다.
                </div>
              ) : (
                weekGroups.map((g) => (
                  <section key={g.key} className="rounded-2xl border border-gray-200 overflow-hidden">
                    {/* 주 헤더 */}
                    <div className="px-4 py-2 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 text-sm font-semibold text-gray-700">
                      {g.label}
                    </div>

                    {/* 해당 주 테이블 */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-white/70 backdrop-blur text-gray-500">
                          <tr className="[&>th]:border-b [&>th]:border-gray-100">
                            <Th>면접 제목</Th>
                            <Th className="w-28 text-center">질문 개수</Th>
                            <Th className="w-32 text-center">분석 상태</Th>
                            <Th className="w-28 text-center">면접 종류</Th>
                            <Th className="w-44 text-right pr-6">면접 날짜</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.items.map((item, idx) => (
                            <tr
                              key={item.id}
                              className={`border-t border-gray-100 transition hover:bg-gray-50 cursor-pointer ${
                                idx % 2 === 1 ? "bg-gray-50/30" : "bg-white"
                              }`}
                              onClick={() => navigate(`/session/${item.id}/preview`, { state: { session: item } })}
                            >
                              <Td>
                                <span
                                  className={`text-[11px] mr-2 font-semibold ${
                                    item.kind === "실전 면접" ? "text-emerald-700" : "text-blue-700"
                                  }`}
                                >
                                  {item.kind === "실전 면접" ? "●" : "●"}
                                </span>
                                <span className="font-medium text-gray-900">Q. {item.title}</span>
                              </Td>
                              <Td className="text-center">
                                <span className="inline-flex min-w-[2.25rem] justify-center rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">
                                  {item.count}
                                </span>
                              </Td>
                              <Td className="text-center">
                                <Badge tone={item.statusTone}>{item.statusText}</Badge>
                              </Td>
                              <Td className="text-center">
                                <span className="inline-flex items-center gap-1">
                                  {item.kind === "실전 면접" ? "⚡" : "🎯"}
                                  {item.kind}
                                </span>
                              </Td>
                              <Td className="text-right pr-6 text-gray-600">{item.date}</Td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      {/* ===== 프로필 편집 + 비밀번호 변경 모달 ===== */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="프로필 수정">
        {/* ▼▼▼ 폼 레이아웃/타이포그래피만 개선 — 로직 동일 ▼▼▼ */}
        <form onSubmit={handleSaveProfile} className="p-5 space-y-6">
          {/* 섹션: 기본 정보 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800">기본 정보</h4>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs text-gray-600">이름</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  value={editProfile.name}
                  onChange={(e) => setEditProfile((p) => ({ ...p, name: e.target.value }))}
                  placeholder="이름을 입력하세요"
                />
                <p className="text-[11px] text-gray-500">실명 또는 서비스에서 보여질 이름</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs text-gray-600">이메일</label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  value={editProfile.email}
                  onChange={(e) => setEditProfile((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@example.com"
                />
                <p className="text-[11px] text-gray-500">로그인/알림에 사용돼요</p>
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* 섹션: 비밀번호 변경 (선택) */}
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-800">비밀번호 변경 (선택)</h4>
              <span className="text-[11px] text-gray-500">입력하지 않으면 변경되지 않습니다</span>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5 md:col-span-1">
                <label className="block text-xs text-gray-600">현재 비밀번호</label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  placeholder="현재 비밀번호"
                  autoComplete="current-password"
                />
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <label className="block text-xs text-gray-600">새 비밀번호</label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  placeholder="8자 이상"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <label className="block text-xs text-gray-600">새 비밀번호 확인</label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  value={pwNew2}
                  onChange={(e) => setPwNew2(e.target.value)}
                  placeholder="다시 입력"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-gray-500">안전을 위해 8자 이상, 추측하기 어려운 조합을 권장합니다.</p>
          </div>

          {formError && (
            <p className="text-sm text-red-500">{formError}</p>
          )}

          <div className="pt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm text-sm"
            >
              저장
            </button>
          </div>
        </form>
        {/* ▲▲▲ 폼 레이아웃/타이포그래피만 개선 — 로직 동일 ▲▲▲ */}
      </Modal>
    </div>
  );
};

export default MyPage;

/* ───── 테이블 유틸 ───── */
function Th({ children, className = "" }) {
  return <th className={`py-3 pl-4 pr-2 text-left font-semibold tracking-tight ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`py-3 pl-4 pr-2 align-middle ${className}`}>{children}</td>;
}
function Badge({ children, tone = "gray" }) {
  const map = {
    blue: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
    green: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    gray: "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${map[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone === "blue" ? "bg-blue-500" : tone === "green" ? "bg-emerald-500" : "bg-gray-500"}`} />
      {children}
    </span>
  );
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
