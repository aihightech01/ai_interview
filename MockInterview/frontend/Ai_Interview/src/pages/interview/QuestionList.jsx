// src/pages/interview/QuestionList.jsx
import React, { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const TABS = [
  { key: "COMMON", label: "공통 면접 질문" },
  { key: "RESUME", label: "자소서 기반 질문" },
  { key: "CUSTOM", label: "커스텀 질문" },
];

// 선택 요약 칸에서 보일 최대 글자수(보수적 제한)
const SUMMARY_MAX_CHARS = 42;

// 안전한 문자열 자르기 (멀티바이트/연속 공백 대응)
function safeTruncate(str = "", max = SUMMARY_MAX_CHARS) {
  const flat = String(str).replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return flat.slice(0, max).trimEnd() + "…";
}

export default function QuestionListPage() {
  const nav = useNavigate();

  // 전체 질문(서버에서 한 번에 받아서 탭에서 필터링)
  const [allQuestions, setAllQuestions] = useState([]); // [{questionId,text,source}]
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // 탭/선택/커스텀 입력/바쁨
  const [tab, setTab] = useState(TABS[0].key);
  const [selected, setSelected] = useState([]); // [{questionId,text,source}]
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  // 전체 보기 모달 상태(문자열이면 열림)
  const [previewText, setPreviewText] = useState(null);

  // Esc로 모달 닫기
  useEffect(() => {
    if (previewText === null) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setPreviewText(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [previewText]);

  // 1) 질문 목록 조회
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { data } = await axiosInstance.get("/questions/my-questions");
        const normalized = (Array.isArray(data) ? data : []).map((d) => ({
          questionId:
            d.questionNO ?? d.questionId ?? d.id ?? d.uuid ?? String(d?.id ?? ""),
          text: d.questionContent ?? d.text ?? d.content ?? "",
          source: d.questionType ?? d.source ?? "COMMON",
        }));
        if (!ignore) setAllQuestions(normalized);
      } catch (e) {
        console.warn("[QuestionList] fetch error:", e);
        if (!ignore) {
          setAllQuestions([]);
          setLoadError("질문을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // 현재 탭에 맞는 리스트
  const currentList = useMemo(
    () => allQuestions.filter((q) => q.source === tab),
    [allQuestions, tab]
  );

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

  // 2) 커스텀 질문 추가
  async function addCustom() {
    const content = draft.trim();
    if (!content) return;
    setBusy(true);
    try {
      const { data } = await axiosInstance.post("/questions/custom", { content });
      if (!data?.success) throw new Error("커스텀 질문 등록 실패");

      const added = {
        questionId: String(data?.question_no ?? Date.now()),
        text: content,
        source: "CUSTOM",
      };

      setAllQuestions((prev) => [added, ...prev]);
      setDraft("");
      alert("커스텀 질문이 추가되었습니다.");
    } catch (e) {
      console.warn("[QuestionList] add custom error:", e);
      alert("커스텀 질문 추가에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  // (옵션) 로컬 삭제
  function removeCustomLocal(q) {
    setAllQuestions((prev) => prev.filter((x) => x.questionId !== q.questionId));
    setSelected((prev) => prev.filter((x) => x.questionId !== q.questionId));
  }

  // 3) 면접 시작: 선택 질문을 sessionStorage에 저장
  function onStart() {
    if (selected.length === 0) return;
    const interviewNo = sessionStorage.getItem("interviewNo");
    if (!interviewNo) {
      alert("면접 세션이 없습니다. 면접 선택 페이지에서 다시 시작해주세요.");
      nav("/interview/select");
      return;
    }
    const payload = selected.map((s) => ({
      questionNO: s.questionId,
      questionId: s.questionId,
      questionContent: s.text,
      questionType: s.source,
    }));
    sessionStorage.setItem("selectedQuestions", JSON.stringify(payload));
    nav("/interview/devices", { state: { interviewNo } });
  }

  // ✅ 우측 요약 3칸
  const slots = [0, 1, 2].map((i) => selected[i] ?? null);

  // 리스트 패널
  const ListPanel = (
    <section className="bg-white border rounded-xl shadow-sm">
      <div className="px-6 pt-5 pb-2 text-xs text-gray-500">선택 가능: 최대 3개</div>
      <div className="px-6 pb-6">
        <div className="border rounded-lg overflow-hidden">
          <ul className="divide-y">
            {loading && currentList.length === 0 && (
              <li className="p-6 text-sm text-gray-500">불러오는 중…</li>
            )}
            {!loading && loadError && (
              <li className="p-6 text-sm text-red-600">{loadError}</li>
            )}
            {!loading && !loadError && currentList.length === 0 && (
              <li className="p-6 text-sm text-gray-500">불러올 질문이 없습니다.</li>
            )}
            {currentList.map((q) => {
              const checked = selected.some((x) => x.questionId === q.questionId);
              return (
                <li
                  key={`${q.source}-${q.questionId}`}
                  className={`p-4 flex items-start gap-3 cursor-pointer ${
                    checked ? "bg-[#F8FAFF]" : "bg-white"
                  }`}
                  onClick={() => toggleChoice(q)}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleChoice(q)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 h-4 w-4 accent-[#3B82F6]"
                  />
                  <p className="text-sm text-gray-800 whitespace-pre-line break-words">
                    {q.text}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );

  // 커스텀 패널
  const customList = useMemo(
    () => allQuestions.filter((q) => q.source === "CUSTOM"),
    [allQuestions]
  );
  const CustomPanel = (
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
          <div className="px-4 py-3 text-sm font-medium text-gray-700">
            내가 만든 질문
          </div>
          <ul className="divide-y">
            {loading && customList.length === 0 && tab === "CUSTOM" && (
              <li className="p-6 text-sm text-gray-500">불러오는 중…</li>
            )}
            {!loading && loadError && (
              <li className="p-6 text-sm text-red-600">{loadError}</li>
            )}
            {!loading && !loadError && customList.length === 0 && (
              <li className="p-6 text-sm text-gray-500">
                등록한 커스텀 질문이 없습니다.
              </li>
            )}
            {customList.map((q) => {
              const checked = selected.some((x) => x.questionId === q.questionId);
              return (
                <li key={`custom-${q.questionId}`} className="p-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleChoice(q)}
                    className="mt-1 h-4 w-4 accent-[#3B82F6]"
                  />
                  <p className="flex-1 text-sm text-gray-800 break-words">{q.text}</p>
                  {/* 서버 삭제 API 명세가 없어서 로컬 삭제만 제공 */}
                  <button
                    onClick={() => removeCustomLocal(q)}
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
    </section>
  );

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
                    <button
                      key={idx}
                      type="button"
                      onClick={() => s && setPreviewText(s.text)}
                      disabled={!s}
                      className={`h-10 w-full rounded-lg border bg-[#F7FAFC] px-3 text-left text-sm ${
                        s
                          ? "text-gray-700 hover:bg-[#EEF2FF] cursor-pointer"
                          : "text-gray-400 cursor-not-allowed"
                      }`}
                      title={s ? s.text : undefined}
                    >
                      <span className="block whitespace-nowrap overflow-hidden text-ellipsis break-words">
                        {s ? safeTruncate(s.text) : "— (선택 시 표시)"}
                      </span>
                    </button>
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

      {/* 전체 보기 모달 (복사 버튼 제거) */}
      {previewText !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"
          onClick={() => setPreviewText(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-xl border p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="full-question-title"
          >
            <div className="flex items-start justify-between gap-4">
              <h4 id="full-question-title" className="text-base font-semibold">
                전체 질문 보기
              </h4>
              <button
                onClick={() => setPreviewText(null)}
                className="text-sm text-gray-500 hover:text-gray-800"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 max-h-[60vh] overflow-auto">
              <p className="whitespace-pre-line break-words text-sm text-gray-800">
                {previewText}
              </p>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setPreviewText(null)}
                className="h-9 px-4 rounded bg-[#3B82F6] text-white text-sm"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
