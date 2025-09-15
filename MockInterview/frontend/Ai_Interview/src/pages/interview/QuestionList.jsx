import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";

const TABS = [
  { key: "COMMON", label: "공통 면접 질문" },
  { key: "RESUME", label: "자소서 기반 질문" },
  { key: "CUSTOM", label: "커스텀 질문" },
];

export default function QuestionListPage() {
  const nav = useNavigate(); // ✅ 훅은 최상단에서만

  // 선택한 질문들
  const [selected, setSelected] = useState([]); // [{questionId,text,source}]
  // 탭 상태
  const [tab, setTab] = useState(TABS[0].key);

  // 공통/자소서 목록
  const [items, setItems] = useState([]);
  // 커스텀 목록 + 입력
  const [customItems, setCustomItems] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  // 탭 전환 시 데이터 로드
  useEffect(() => {
    const ac = new AbortController();
    const run = async () => {
      setLoading(true);
      try {
        if (tab === "CUSTOM") {
          const { data } = await axiosInstance.get(API_PATHS.CUSTOM_QUESTIONS, {
            signal: ac.signal,
          });
          // 백엔드에서 id/content로 줄 수도 있으니 방어 매핑
          const arr = Array.isArray(data) ? data : [];
          setCustomItems(
            arr.map((d) => ({
              questionId: d.questionId ?? d.id ?? d.uuid ?? String(d?.id ?? ""),
              text: d.text ?? d.content ?? "",
              source: d.source ?? "CUSTOM",
            }))
          );
        } else {
          const { data } = await axiosInstance.get(
            `${API_PATHS.QUESTIONS}?source=${encodeURIComponent(tab)}&limit=50`,
            { signal: ac.signal }
          );
          const arr = Array.isArray(data) ? data : [];
          setItems(
            arr.map((d) => ({
              questionId: d.questionId ?? d.id ?? d.uuid ?? String(d?.id ?? ""),
              text: d.text ?? d.content ?? "",
              source: d.source ?? tab,
            }))
          );
        }
      } catch (e) {
        if (ac.signal.aborted) return;
        console.warn("[QuestionList] fetch error:", e);
        if (tab === "CUSTOM") setCustomItems([]);
        else setItems([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    };
    run();
    return () => ac.abort();
  }, [tab]);

  // 체크 토글 (최대 3개)
  function toggleChoice(q) {
    const exists = selected.find((x) => x.questionId === q.questionId);
    if (exists) {
      setSelected(selected.filter((x) => x.questionId !== q.questionId));
    } else if (selected.length < 3) {
      setSelected([...selected, q]);
    } else {
      alert("최대 3개까지 선택할 수 있어요.");
    }
  }

  // 면접 시작 (mock: 세션 생성)
  async function onStart() {
    if (selected.length === 0) return;
    try {
      const questionIds = selected.map((s) => s.questionId);
      const { data } = await axiosInstance.post(API_PATHS.INTERVIEWS, { questionIds });
      const sessionId = data?.sessionId ?? data?.id ?? data?.session?.id;
      if (!sessionId) throw new Error("No session id");
      nav("/interview/devices", { state: { sessionId } });
    } catch (e) {
      console.warn("[QuestionList] start error:", e);
      alert("세션 생성에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  }

  // 커스텀 추가/삭제
  async function addCustom() {
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    try {
      const { data } = await axiosInstance.post(API_PATHS.CUSTOM_QUESTIONS, { text });
      const q = {
        questionId: data?.questionId ?? data?.id ?? String(Date.now()),
        text: data?.text ?? text,
        source: "CUSTOM",
      };
      setCustomItems((prev) => [q, ...prev]);
      setDraft("");
    } catch (e) {
      console.warn("[QuestionList] add custom error:", e);
      alert("커스텀 질문 추가에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function removeCustom(q) {
    setBusy(true);
    try {
      await axiosInstance.delete(`${API_PATHS.CUSTOM_QUESTIONS}/${q.questionId}`);
      setCustomItems((prev) => prev.filter((x) => x.questionId !== q.questionId));
      setSelected((prev) => prev.filter((x) => x.questionId !== q.questionId));
    } catch (e) {
      console.warn("[QuestionList] remove custom error:", e);
      alert("삭제에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  // 우측 요약 3칸
  const slots = [0, 1, 2].map((i) => selected[i] ?? null);

  // 공통/자소서 리스트 패널
  const ListPanel =
    <section className="bg-white border rounded-xl shadow-sm">
      <div className="px-6 pt-5 pb-2 text-xs text-gray-500">선택 가능: 최대 3개</div>
      <div className="px-6 pb-6">
        <div className="border rounded-lg overflow-hidden">
          <ul className="divide-y">
            {loading && items.length === 0 && (
              <li className="p-6 text-sm text-gray-500">불러오는 중…</li>
            )}
            {!loading && items.length === 0 && (
              <li className="p-6 text-sm text-gray-500">불러올 질문이 없습니다.</li>
            )}
            {items.map((q) => {
              const checked = selected.some((x) => x.questionId === q.questionId);
              return (
                <li
                  key={q.questionId}
                  className={`p-4 flex items-start gap-3 cursor-pointer ${checked ? "bg-[#F8FAFF]" : "bg-white"}`}
                  onClick={() => toggleChoice(q)}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleChoice(q)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 h-4 w-4 accent-[#3B82F6]"
                  />
                  <p className="text-sm text-gray-800">{q.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>;

  // 커스텀 패널
  const CustomPanel =
    <section className="bg-white border rounded-xl shadow-sm">
      <div className="px-6 pt-5 pb-2 text-xs text-gray-500">선택 가능: 최대 3개</div>

      <div className="px-6">
        <div className="border rounded-xl p-4">
          <textarea
            placeholder="직접 질문 입력"
            className="w-full h-28 border rounded p-3 text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="mt-2 w-full flex justify-end">
            <button
              onClick={addCustom}
              disabled={!draft.trim() || busy}
              className="px-3 h-8 rounded bg-[#3B82F6] text-white text-sm disabled:opacity-50"
            >
              질문 추가
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="mt-4 border rounded-lg overflow-hidden">
          <div className="px-4 py-3 text-sm font-medium text-gray-700">내가 만든 질문</div>
          <ul className="divide-y">
            {loading && customItems.length === 0 && tab === "CUSTOM" && (
              <li className="p-6 text-sm text-gray-500">불러오는 중…</li>
            )}
            {!loading && customItems.length === 0 && (
              <li className="p-6 text-sm text-gray-500">등록한 커스텀 질문이 없습니다.</li>
            )}
            {customItems.map((q) => {
              const checked = selected.some((x) => x.questionId === q.questionId);
              return (
                <li key={q.questionId} className="p-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleChoice(q)}
                    className="mt-1 h-4 w-4 accent-[#3B82F6]"
                  />
                  <p className="flex-1 text-sm text-gray-800">{q.text}</p>
                  <button
                    onClick={() => removeCustom(q)}
                    className="px-3 h-8 text-xs rounded bg-[#3B82F6] text-white"
                    disabled={busy}
                  >
                    삭제
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>;

  return (
    <div className="min-h-screen w-full bg-[#F7FAFC] flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-4 py-8">
          {/* 탭 */}
          <div className="flex items-center gap-2 mb-4">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 h-9 rounded-full text-sm border ${
                  tab === t.key
                    ? "bg-[#2B6CB0] text-white border-[#2B6CB0]"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 좌: 패널 / 우: 요약 */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            {tab === "CUSTOM" ? CustomPanel : ListPanel}

            {/* 선택 요약 */}
            <aside className="bg-white border rounded-xl shadow-sm h-max">
              <div className="p-6">
                <h3 className="font-semibold mb-4">선택 요약 ({selected.length}/3)</h3>
                <div className="space-y-3">
                  {slots.map((s, idx) => (
                    <div
                      key={idx}
                      className="h-10 rounded-lg border bg-[#F7FAFC] flex items-center px-3 text-sm text-gray-500"
                    >
                      {s ? s.text : "— (선택 시 표시)"}
                    </div>
                  ))}
                </div>
                <button
                  className="mt-5 w-28 h-9 rounded bg-[#3B82F6] text-white text-sm disabled:opacity-50"
                  onClick={onStart}
                  disabled={selected.length === 0}
                >
                  면접 시작
                </button>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
