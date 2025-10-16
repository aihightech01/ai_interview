// src/pages/interview/QuestionList.jsx
import React, { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";

import { splitNumberedQuestions } from "../../utils/helper";
import { useInterviewStore } from "../../stores/interviewStore"; // ✅ 제목은 스토어 우선

const TABS = [
  { key: "COMMON", label: "공통 면접 질문" },
  { key: "RESUME", label: "자소서 기반 질문" },
  { key: "CUSTOM", label: "커스텀 질문" },
];

const SUMMARY_MAX_CHARS = 42;
function safeTruncate(str = "", max = SUMMARY_MAX_CHARS) {
  const flat = String(str).replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return flat.slice(0, max).trimEnd() + "…";
}

export default function QuestionListPage() {
  const nav = useNavigate();

  // ✅ 인터뷰 제목: 스토어 우선, 없으면 세션 보조
  const storeTitle = useInterviewStore((s) => s.title);
  const setStoreTitle = useInterviewStore((s) => s.setTitle);
  const [interviewTitle, setInterviewTitle] = useState("");

  // 인터뷰 유형(실전/모의) — 현재는 sessionStorage에서 로드
  const [interviewType, setInterviewType] = useState(null);             // 1 | 2
  const [interviewTypeLabel, setInterviewTypeLabel] = useState("");     // "실전 면접" | "모의 면접"
  const [interviewTypeColor, setInterviewTypeColor] = useState("blue"); // "emerald" | "blue"

  // 전체 질문(탭 필터용)
  const [allQuestions, setAllQuestions] = useState([]); // [{questionId,text,source}]
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // 탭/선택/커스텀 입력/바쁨
  const [tab, setTab] = useState(TABS[0].key);
  const [selected, setSelected] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  // 전체 보기 모달
  const [previewText, setPreviewText] = useState(null);
  useEffect(() => {
    if (previewText === null) return;
    const onKeyDown = (e) => { if (e.key === "Escape") setPreviewText(null); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [previewText]);

  // 세션 정보 로드 (제목/유형)
  useEffect(() => {
    // ✅ 제목: 스토어 → 세션 순으로 로드
    const ssTitle = sessionStorage.getItem("interviewTitle") || "";
    const finalTitle = storeTitle?.trim() || ssTitle;
    setInterviewTitle(finalTitle);
    if (!storeTitle && ssTitle) setStoreTitle(ssTitle); // 스토어 비어있다면 동기화

    // 유형은 기존 로직 유지 (필요시 store로 확장)
    const typeStr = sessionStorage.getItem("interviewType");
    if (typeStr) {
      const t = Number(typeStr);
      setInterviewType(t);
      setInterviewTypeLabel(
        sessionStorage.getItem("interviewTypeLabel") || (t === 1 ? "실전 면접" : "모의 면접")
      );
      setInterviewTypeColor(
        sessionStorage.getItem("interviewTypeColor") || (t === 1 ? "emerald" : "blue")
      );
    }
  }, [storeTitle, setStoreTitle]);

  // 공통 함수: 배열 응답 정규화 (항목 내부가 번호 묶음이면 분해)
  const normalizeFromArray = (arr) => {
    const out = [];
    arr.forEach((d, idx) => {
      const source = String(d.questionType ?? d.source ?? "COMMON").toUpperCase();
      const content = d.questionContent ?? d.text ?? d.content ?? "";
      const idBase = d.questionNO ?? d.questionId ?? d.id ?? d.uuid ?? `${source}-${idx}`;

      const pieces = splitNumberedQuestions(content);
      if (pieces.length > 1) {
        pieces.forEach((p) => {
          out.push({
            questionId: `${idBase}-${p.id}`,
            text: p.text.replace(/^\s*\d+\s*[.)-]\s*/, "").trim(),
            source, // COMMON/RESUME 등
          });
        });
      } else if (content.trim()) {
        out.push({
          questionId: String(idBase),
          text: content.replace(/^\s*\d+\s*[.)-]\s*/, "").trim(),
          source,
        });
      }
    });
    return out;
  };

  // 1) 질문 목록 조회 — COMMON/RESUME 모두 채우기 + 보강 호출
  useEffect(() => {
    let ignore = false;

    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { data } = await axiosInstance.get("/questions/my-questions");

        let normalized = [];

        if (Array.isArray(data)) {
          // ✅ 배열이면 각 항목의 questionType으로 COMMON/RESUME 분류 + 내부 묶음 분해
          normalized = normalizeFromArray(data);
        } else if (Array.isArray(data?.items)) {
          normalized = normalizeFromArray(data.items);
        } else {
          // ✅ 문자열 묶음이면 RESUME로만 분해
          const raw =
            typeof data === "string"
              ? data
              : typeof data?.questionsText === "string"
              ? data.questionsText
              : null;

          if (raw) {
            const pieces = splitNumberedQuestions(raw);
            normalized = pieces.map((p) => ({
              questionId: `RES-${p.id}`,
              text: p.text.replace(/^\s*\d+\s*[.)-]\s*/, "").trim(),
              source: data?.source?.toUpperCase?.() || "RESUME",
            }));
          }
        }

        // ❗ COMMON이 비어 있으면 보강 호출 (백엔드가 분리 API인 경우)
        if (!ignore && normalized.filter((q) => q.source === "COMMON").length === 0) {
          try {
            const { data: commonData } = await axiosInstance.get("/questions/common");
            if (Array.isArray(commonData)) {
              normalized = [...normalizeFromArray(commonData), ...normalized];
            } else if (
              typeof commonData === "string" ||
              typeof commonData?.questionsText === "string"
            ) {
              const raw =
                typeof commonData === "string"
                  ? commonData
                  : commonData.questionsText;
              const pieces = splitNumberedQuestions(raw);
              const extra = pieces.map((p) => ({
                questionId: `COM-${p.id}`,
                text: p.text.replace(/^\s*\d+\s*[.)-]\s*/, "").trim(),
                source: "COMMON",
              }));
              normalized = [...extra, ...normalized];
            }
          } catch {
            // 보강 실패는 무시
          }
        }

        if (!ignore) {
          setAllQuestions(normalized);

          // 기본 탭: COMMON 있으면 COMMON, 아니면 RESUME
          const hasCommon = normalized.some((q) => q.source === "COMMON");
          setTab(hasCommon ? "COMMON" : "RESUME");
        }
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

  // 현재 탭 리스트
  const currentList = useMemo(
    () => allQuestions.filter((q) => q.source === tab),
    [allQuestions, tab]
  );

  // 선택 토글 (최대 3개)
  function toggleChoice(q) {
    const exists = selected.find((x) => x.questionId === q.questionId);
    if (exists) setSelected(selected.filter((x) => x.questionId !== q.questionId));
    else if (selected.length < 3) setSelected([...selected, q]);
    else alert("최대 3개까지 선택할 수 있어요.");
  }

  // 2) 커스텀 질문 추가 — 여러 문항 붙여넣기 지원
  async function addCustom() {
    const content = draft.trim();
    if (!content) return;

    const parsed = splitNumberedQuestions(content);
    const toAdd = parsed.length ? parsed : [{ id: 1, text: content }];

    setBusy(true);
    try {
      const { data } = await axiosInstance.post("/questions/custom", { content });
      if (!data?.success) throw new Error("커스텀 질문 등록 실패");

      const baseId = String(data?.question_no ?? Date.now());
      const created = toAdd.map((p) => ({
        questionId: `${baseId}-${p.id}`,
        text: p.text,
        source: "CUSTOM",
      }));

      setAllQuestions((prev) => [...created, ...prev]);
      setDraft("");
      alert(
        created.length > 1
          ? `${created.length}개의 커스텀 질문이 추가되었습니다.`
          : "커스텀 질문이 추가되었습니다."
      );
    } catch (e) {
      console.warn("[QuestionList] add custom error:", e);
      alert("커스텀 질문 추가에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  // 로컬 삭제(옵션)
  function removeCustomLocal(q) {
    setAllQuestions((prev) => prev.filter((x) => x.questionId !== q.questionId));
    setSelected((prev) => prev.filter((x) => x.questionId !== q.questionId));
  }

  // 3) 면접 시작
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

  const slots = [0, 1, 2].map((i) => selected[i] ?? null);

  // 리스트 패널 (그레이 테두리 & 모던)
  const ListPanel = (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-6 pt-5 pb-2 text-xs text-gray-500">선택 가능: 최대 3개</div>
      <div className="px-6 pb-6">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <ul className="divide-y divide-gray-100">
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
                  className={`p-4 flex items-start gap-3 cursor-pointer transition ${
                    checked ? "bg-[#F8FAFF]" : "bg-white hover:bg-gray-50"
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

  // 커스텀 패널 (그레이 테두리 & 모던)
  const customList = useMemo(
    () => allQuestions.filter((q) => q.source === "CUSTOM"),
    [allQuestions]
  );
  const CustomPanel = (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-6 pt-5 pb-2 text-xs text-gray-500">선택 가능: 최대 3개</div>

      <div className="px-6">
        <div className="border border-gray-200 rounded-xl p-4">
          <textarea
            placeholder={`직접 질문 입력 (여러 개면 예)\n1) 자기소개를 해주세요\n2. 지원 동기는 무엇인가요?`}
            className="w-full h-28 border border-gray-200 rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="mt-2 w-full flex justify-end">
            <button
              onClick={addCustom}
              disabled={!draft.trim() || busy}
              className="px-4 h-10 rounded-lg bg-[#2B6CB0] text-white text-sm shadow-sm disabled:opacity-50"
            >
              질문 추가
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 text-sm font-medium text-gray-700 border-b border-gray-100">
            내가 만든 질문
          </div>
          <ul className="divide-y divide-gray-100">
            {loading && customList.length === 0 && tab === "CUSTOM" && (
              <li className="p-6 text-sm text-gray-500">불러오는 중…</li>
            )}
            {!loading && loadError && (
              <li className="p-6 text-sm text-red-600">{loadError}</li>
            )}
            {!loading && !loadError && customList.length === 0 && (
              <li className="p-6 text-sm text-gray-500">등록한 커스텀 질문이 없습니다.</li>
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
                  <button
                    onClick={() => removeCustomLocal(q)}
                    className="px-3 h-8 text-xs rounded bg-white border border-gray-200 hover:bg-gray-50"
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

          {/* 상단: 제목 + 유형 뱃지 (그레이 테두리, 모던) */}
          <section className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6">
            <div className="p-6 flex items-center justify-between gap-4">
              {/* 제목 + 전페이지 입력한 인터뷰 제목을 나란히 표시 */}
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-lg font-semibold text-gray-900">인터뷰 질문 선택</h1>
                {interviewTitle && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-700">
                      <span className="align-middle">제목:</span>{" "}
                      <strong className="align-middle">{interviewTitle}</strong>
                    </span>
                  </>
                )}
                <p className="w-full mt-1 text-xs text-gray-500">
                  최대 3개의 질문을 선택해 면접을 시작하세요.
                </p>
              </div>

              {/* 우측: 실전/모의 태그 */}
              {interviewType && (
                <div className="flex items-center gap-2">
                  <span className={chipCls(interviewTypeColor)}>{interviewTypeLabel}</span>
                  <button
                    type="button"
                    onClick={() => nav("/interview/select")}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    변경
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* 탭 */}
          <div className="flex items-center gap-2 mb-4">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 h-9 rounded-full text-sm border transition ${
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

            {/* 선택 요약 (그레이 테두리) */}
            <aside className="bg-white border border-gray-200 rounded-xl shadow-sm h-max">
              <div className="p-6">
                <h3 className="font-semibold mb-4">선택 요약 ({selected.length}/3)</h3>
                <div className="space-y-3">
                  {slots.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => s && setPreviewText(s.text)}
                      disabled={!s}
                      className={`h-10 w-full rounded-lg border border-gray-200 bg-[#F7FAFC] px-3 text-left text-sm transition ${
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
                  className="mt-5 w-28 h-9 rounded-lg bg-[#2B6CB0] text-white text-sm shadow-sm disabled:opacity-50"
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


      {/* 전체 보기 모달 */}
      {previewText !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"
          onClick={() => setPreviewText(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-xl border border-gray-200 p-5"
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
                className="h-9 px-4 rounded-lg bg-[#2B6CB0] text-white text-sm"
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

/* === helper: 칩(태그) 스타일 === */
function chipCls(color = "blue") {
  const map = {
    emerald:
      "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-emerald-200 bg-emerald-50 text-emerald-700",
    blue:
      "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700",
  };
  return map[color] || map.blue;
}
