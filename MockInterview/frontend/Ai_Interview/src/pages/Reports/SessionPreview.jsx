// src/pages/Reports/SessionPreview.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

/** 로컬 드라이브/파일 스킴 차단 + 슬래시 보정 */
function toPath(p) {
  if (!p) return "";
  const s = String(p);
  const lower = s.toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("blob:")) return s;
  if (lower.startsWith("file:") || /[A-Za-z]:\\/.test(s)) return "";
  return s.startsWith("/") ? s : `/${s}`;
}

/** Windows 로컬 경로 → 썸네일 서버 URL (네 환경에 맞게 호스트만 바꿔) */
function buildThumbUrlFromLocalPath(localPath) {
  if (!localPath) return "";
  // 예: GET /thumbnail?path=D%3A%5CinterviewVideos%5Cxxx.png
  const host = "http://172.31.57.139:8080";
  return `${host}/thumbnail?path=${encodeURIComponent(localPath)}`;
}

/** clip → 비디오 스트림 URL 생성 (API_PATHS가 제공되면 우선 사용) */
function getVideoUrlFromClip(c) {
  const no = c?.videoNo ?? c?.videoNO ?? c?.videono ?? c?.VideoNo ?? null;
  if (no != null && API_PATHS?.VIDEOS?.STREAM) {
    try {
      const u = API_PATHS.VIDEOS.STREAM(no);
      return toPath(u);
    } catch {
      // API_PATHS 규격 다를 수도 있으니 무시
    }
  }
  if (c?.videoStreamUrl) {
    const t = c.videoStreamUrl;
    const resolved = t.includes("{videoNo}") ? t.replace("{videoNo}", String(no ?? "")) : t;
    return toPath(resolved);
  }
  return toPath(c?.videoUrl || c?.videoDir || c?.path || "");
}

/** clip → 포스터(썸네일) URL (로컬 경로면 썸네일 서버로 변환) */
function getPosterFromClip(c) {
  const raw =
    c?.thumbnailUrl ?? c?.poster ?? c?.thumbnailDir ?? c?.thumb ?? "";
  // 로컬/Windows 경로면 빈 스트링이 나오므로 서버 URL로 만들어준다
  if (!raw || /[A-Za-z]:\\/.test(String(raw))) {
    return buildThumbUrlFromLocalPath(c?.thumbnailDir ?? raw);
  }
  return toPath(raw);
}

/** 문자열/객체 모두 안전 파싱 */
function safeParseJSON(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      const trimmed = value.trim();
      // 순수 텍스트가 오는 경우를 대비해 overallcompare로 감싸줌
      if (!trimmed.startsWith("{")) return { overallcompare: trimmed };
      return JSON.parse(trimmed);
    } catch {
      return { overallcompare: String(value) };
    }
  }
  return null;
}

/** \n, \\n 정규화 */
function normalizeNewlines(s) {
  if (typeof s !== "string") return s;
  return s.includes("\\n") && !s.includes("\n") ? s.replaceAll("\\n", "\n") : s;
}

/** 총평/비교 텍스트를 응답에서 추출 (interview.interviewOverall까지 커버) */
function extractOverallAndComparison(data, list) {
  // 1) 평문/직접 필드
  let rawOverall =
    data?.interview_overall ??
    data?.interviewOverall ??
    data?.overall ??
    null;

  // 2) 중첩(interview 객체 내부)
  if (!rawOverall) {
    rawOverall =
      data?.interview?.interview_overall ??
      data?.interview?.interviewOverall ??
      null;
  }

  const parsedFromOverall = safeParseJSON(rawOverall);

  let overall =
    normalizeNewlines(parsedFromOverall?.overallcompare) ??
    normalizeNewlines(data?.overallcompare) ??
    normalizeNewlines(data?.interview?.overallcompare) ??
    null;

  let comparison =
    normalizeNewlines(parsedFromOverall?.comparison) ??
    normalizeNewlines(data?.comparison) ??
    normalizeNewlines(data?.interview?.comparison) ??
    null;

  // 3) 리스트 내부 where available
  if (!overall || !comparison) {
    const arr = Array.isArray(list) ? list : [];
    for (const c of arr) {
      overall =
        overall ??
        normalizeNewlines(
          c?.overallcompare ??
            c?.overall ??
            c?.analysis?.overall ??
            c?.analysis?.overallcompare
        );
      comparison =
        comparison ??
        normalizeNewlines(c?.comparison ?? c?.analysis?.comparison);
      if (overall && comparison) break;
    }
  }

  return { overall, comparison };
}

/** JSON 프린트 유틸 (에러 방지) */
function prettyJSON(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj ?? "");
  }
}

/** 날짜 포맷(간단) */
function fmtDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${hh}:${mm}`;
  } catch {
    return iso;
  }
}

export default function SessionPreview() {
  const { sessionId } = useParams();
  const nav = useNavigate();

  const [rawResponse, setRawResponse] = useState(null); // /user/profile/{sessionId}
  const [rawProfile, setRawProfile] = useState(null);   // /user/profile
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [completedCount, setCompletedCount] = useState(0);
  const [overallText, setOverallText] = useState("");
  const [comparisonText, setComparisonText] = useState("");

  // 인터뷰 메타
  const [interviewMeta, setInterviewMeta] = useState({ title: "", date: "" });

  useEffect(() => {
    let abort = false;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        // 두 API 병렬 호출
        const [sessionRes, profileRes] = await Promise.all([
          api.get(`/user/profile/${encodeURIComponent(String(sessionId ?? ""))}`),
          api.get(`/user/profile`),
        ]);

        if (!abort) {
          setRawResponse(sessionRes?.data ?? null);
          setRawProfile(profileRes?.data ?? null);
        }

        const data = sessionRes?.data ?? {};

        // ✅ 1) 리스트 꺼내기: videos → 표준화
        const list = Array.isArray(data?.videos)
          ? data.videos
          : Array.isArray(data?.clips)
          ? data.clips
          : Array.isArray(data)
          ? data
          : [];

        const normalized = (list ?? []).map((c, idx) => {
          const videoNo =
            c?.videoNo ?? c?.videoNO ?? c?.videono ?? c?.VideoNo ?? null;
          return {
            ...c,
            videoNo,
            posterUrl: getPosterFromClip(c),
            videoUrl: getVideoUrlFromClip(c),
            // 질문 텍스트 통일
            questionNo: c?.questionNo ?? c?.qNo ?? c?.no ?? (idx + 1),
            questionContent: c?.questionContent ?? c?.content ?? c?.question ?? "",
          };
        });

        // ✅ 2) 완료 개수: 서버가 completed 주지 않으면, videos 길이로 간주
        const doneCount = normalized.length;

        // ✅ 3) 총평/비교 추출 (interview.interviewOverall 포함)
        const { overall, comparison } = extractOverallAndComparison(data, normalized);

        const _overallText =
          doneCount < 3
            ? "3개의 질문을 완료하지 않을경우 총평을 제공하지 않습니다."
            : (overall && String(overall).trim()) || "총평 데이터가 존재하지 않습니다.";

        const _comparisonText =
          (comparison && String(comparison).trim()) ||
          "이전 인터뷰 데이터가 없어 비교 결과를 제공하지 않습니다.";

        // ✅ 4) 메타: 면접 제목/날짜
        const interviewTitle =
          data?.interview?.interviewTitle ??
          data?.interviewTitle ??
          "";
        const interviewDate =
          data?.interview?.interviewDate ??
          data?.interviewDate ??
          "";

        if (!abort) {
          setClips(normalized);
          setCompletedCount(doneCount);
          setOverallText(_overallText);
          setComparisonText(_comparisonText);
          setInterviewMeta({
            title: interviewTitle ?? "",
            date: interviewDate ? fmtDate(interviewDate) : "",
          });
        }
      } catch (e) {
        if (!abort) setErr("질문/영상 목록을 불러오지 못했습니다.");
      } finally {
        if (!abort) setLoading(false);
      }
    })();

    return () => {
      abort = true;
    };
  }, [sessionId]);

  const goDetail = (clip) => {
    if (!clip?.videoNo) return;
    const stateClip = {
      ...clip,
      poster: clip.posterUrl || getPosterFromClip(clip) || undefined,
      videoUrl: clip.videoUrl || getVideoUrlFromClip(clip) || undefined,
    };
    nav(`/session/${sessionId}/${clip.videoNo}`, {
      state: { clip: stateClip },
    });
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      {/* 상단 바 */}
      <header className="top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <button onClick={() => nav(-1)} className="px-3 py-1 rounded hover:bg-gray-100">
            ← 뒤로
          </button>
          <div className="text-sm text-gray-500">
            세션 #{sessionId}
            {interviewMeta.date ? ` · ${interviewMeta.date}` : ""}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
          {/* 헤더 */}
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900">면접 분석 결과</h2>
            <p className="text-sm text-gray-500 mt-1">
              {interviewMeta.title ? `${interviewMeta.title} · ` : ""}
              세션 #{sessionId} · 질문 {completedCount}개
            </p>
          </div>
{/* 


          {/* 총평 + 비교 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="w-full md:col-span-2 col-span-full rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
                <h3 className="text-sm font-semibold text-gray-900">총평</h3>
              </div>
              <div className="text-[15px] text-gray-700 leading-7 tracking-tight whitespace-pre-line">
                {overallText}
              </div>

              <div className="flex items-center gap-2 mb-3 mt-8">
                <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
                <h3 className="text-sm font-semibold text-gray-900">이전 인터뷰와 비교</h3>
              </div>
              <div className="text-[15px] text-gray-700 leading-7 tracking-tight whitespace-pre-line">
                {comparisonText}
              </div>
            </section>
          </div>

          {/* 질문 카드 리스트 */}
          <section className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-4">질문별 분석</h3>
            {loading ? (
              <div className="py-16 text-center text-sm text-gray-500">불러오는 중…</div>
            ) : err ? (
              <div className="py-16 text-center text-sm text-red-500">{err}</div>
            ) : clips.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-500">표시할 항목이 없습니다.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {clips.map((c, idx) => (
                  <button
                    key={c.videoNo ?? `${c.questionNo}-${idx}`}
                    onClick={() => goDetail(c)}
                    disabled={!c.videoNo}
                    className={`rounded-2xl border border-gray-200 shadow-sm overflow-hidden bg-white hover:shadow-md transition text-left ${!c.videoNo ? "opacity-50 cursor-not-allowed" : ""}`}
                    title={c.videoNo ? "" : "videoNo가 없어 이동할 수 없습니다"}
                  >
                    <div className="h-42 bg-blue-50">
                      {c.posterUrl ? (
                        <img
                          src={c.posterUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-lg overflow-hidden">
                          {/* 최후의 보루: thumbnailDir을 서버로 변환 */}
                          <img
                            src={buildThumbUrlFromLocalPath(c.thumbnailDir ?? "")}
                            alt="thumbnail"
                            className="max-w-full max-h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-gray-400 mb-1">Q{c.questionNo}</p>
                      <p className="text-sm font-medium text-gray-900">
                        {c.questionContent}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
