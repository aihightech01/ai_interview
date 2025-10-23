// src/pages/Reports/SessionDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import EmotionOnlySynced from "../../components/EmotionOnlySynced";
import FocusOnlySynced from "../../components/FocusOnlySynced";
import { parseEmotion, toEmotionChartData } from "../../utils/transformEmotion";

/** 안전 파싱 */
function safeParseJSON(maybeJSON, fallback = null) {
  try {
    if (maybeJSON == null) return fallback;
    if (typeof maybeJSON === "string") return JSON.parse(maybeJSON);
    return maybeJSON;
  } catch {
    return fallback;
  }
}

/** 이중 인코딩까지 커버 */
function parseJSONDeep(maybeJSON, fallback = null) {
  try {
    if (maybeJSON == null) return fallback;
    let v = typeof maybeJSON === "string" ? JSON.parse(maybeJSON) : maybeJSON;
    if (typeof v === "string") v = JSON.parse(v);
    return v;
  } catch {
    return fallback;
  }
}

/** 슬래시 보정 (로컬 경로 차단) */
function toPath(p) {
  if (!p) return "";
  const lower = String(p).toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("blob:"))
    return p;
  if (lower.startsWith("file:")) return "";
  if (/[A-Za-z]:\\/.test(p)) return "";
  return p.startsWith("/") ? p : `/${p}`;
}

/** vision → 차트용 */
function toVisionChartData(visionRaw, fps = 30) {
  const f = Math.max(1, Number(fps) || 30);
  const RAD2DEG = 180 / Math.PI;
  if (!Array.isArray(visionRaw)) return [];
  return visionRaw.map((d) => {
    const frame = Number(d.frame);
    const headYaw = Number(d.head_yaw);
    const headPitch = Number(d.head_pitch);
    let gazeYaw = Number(d.gaze_yaw);
    let gazePitch = Number(d.gaze_pitch);
    let score = Number(d.score);
    if (Math.abs(gazeYaw) < 3 && Math.abs(gazePitch) < 3) {
      gazeYaw *= RAD2DEG;
      gazePitch *= RAD2DEG;
    }
    return {
      frame,
      tSec: frame / f,
      headYaw,
      headPitch,
      gazeYaw,
      gazePitch,
      score,
    };
  });
}

/* ───────────── UI 보조 컴포넌트 ───────────── */
function SectionTitle({ children }) {
  return <h3 className="text-sm font-semibold text-gray-900">{children}</h3>;
}
function Pill({ children, color = "slate" }) {
  const map = {
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-rose-50 text-rose-700 ring-rose-200",
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1 ${map[color] || map.slate}`}
    >
      {children}
    </span>
  );
}
function CopyButton({ text, className = "" }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text || "");
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {}
      }}
      className={`h-8 px-3 rounded-md border text-xs hover:bg-gray-50 ${className}`}
      title="복사"
      type="button"
    >
      {copied ? "복사됨" : "복사"}
    </button>
  );
}
/* ─────────────────────────────────────────── */

export default function SessionDetail() {
  const { state } = useLocation();
  const nav = useNavigate();
  const { sessionId, videoNo } = useParams();

  const [clip, setClip] = useState(state?.clip ?? null);
  const [loading, setLoading] = useState(!state?.clip);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("면접 집중도");

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const url = API_PATHS.USER.PROFILE_DETAIL(sessionId, videoNo);
        const { data } = await api.get(url);
        if (!ignore) setClip((prev) => ({ ...(prev || {}), ...(data || {}) }));
      } catch {
        if (!ignore) setErr("분석 데이터를 불러오지 못했습니다.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [sessionId, videoNo]);

  // 분석 파싱
  const analysis = useMemo(() => parseJSONDeep(clip?.analysis, {}) || {}, [clip]);

  // vision
  const visionRaw = useMemo(() => parseJSONDeep(analysis?.vision, []), [analysis]);
  const FPS = 30;
  const visionChartData = useMemo(() => toVisionChartData(visionRaw, FPS), [visionRaw]);

  // emotion/answer
  const emotions = useMemo(() => parseEmotion(analysis?.emotion), [analysis]);
  const answer = useMemo(() => safeParseJSON(analysis?.answer, {}) || {}, [analysis]);
  const emotionChartData = useMemo(() => toEmotionChartData(emotions, 30), [emotions]);

  const score = useMemo(() => {
    if (answer?.score == null) return null;
    const n = Number(answer.score);
    return Number.isFinite(n) ? n : null;
  }, [answer]);

  // ✅ STT 세그먼트: analysis.answer.timeline_answer(문자열 JSON → 2중 파싱)
  const sttSegments = useMemo(() => {
    const answerObj = parseJSONDeep(analysis?.answer, {}); // 1차
    const segs = parseJSONDeep(answerObj?.timeline_answer, []); // 2차
    return Array.isArray(segs) ? segs : [];
  }, [analysis]);

  // 비디오/포스터
  let videoUrl = "";
  const _videoNo = clip?.videoNo ?? clip?.videoNO ?? videoNo; // 대소문자 혼용 방어
  if (_videoNo != null) {
    videoUrl = toPath(API_PATHS?.VIDEOS?.STREAM?.(_videoNo));
  } else if (clip?.videoStreamUrl) {
    const templated = clip.videoStreamUrl;
    const resolved = templated.includes("{videoNo}")
      ? templated.replace("{videoNo}", String(_videoNo ?? ""))
      : templated;
    videoUrl = toPath(resolved);
  }
  const thumbUrl = toPath(clip?.thumbnailDir);

  if (loading) return <div className="p-6">로딩중…</div>;
  if (err || !clip) {
    return (
      <div className="p-6">
        {err || "데이터가 없습니다."}
        <button onClick={() => nav(-1)} className="ml-2 underline">
          뒤로
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* 상단 바 */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <button onClick={() => nav(-1)} className="px-3 py-1 rounded hover:bg-gray-100">
            ← 뒤로
          </button>
          <div className="text-sm text-gray-500">세션 #{sessionId} / 비디오 #{_videoNo}</div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        {/* 타이틀 */}
        <section className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold">프리뷰 분석 결과</h2>
          <p className="mt-1 text-sm text-gray-600">
            문항 “{clip.questionContent ?? `Q${clip.questionNo}`}”에 대한 결과입니다.
          </p>
          <div className="mt-3 text-xs text-gray-500 flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-gray-100 border">
              영상번호 #{_videoNo ?? "-"}
            </span>
            {score !== null && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                답변 점수 {score}%
              </span>
            )}
          </div>
        </section>

        {/* 총평/포인트 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-medium mb-2">총평</h3>
            {score !== null ? (
              <p className="text-sm text-gray-700">
                합격 가능성 지표 <span className="font-semibold text-blue-600">{score}%</span>
              </p>
            ) : (
              <p className="text-sm text-gray-700">분석 스코어가 제공되지 않았습니다.</p>
            )}
          </div>

          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-medium mb-2">포인트</h3>
            <ul className="text-sm text-gray-700 list-disc pl-4 space-y-1">
              <li>시선 각도(head/gaze) 변화 추세 파악</li>
              <li>감정 확률의 급격한 피크 구간 확인</li>
              <li>개선 답변을 다음 답변 스크립트에 반영</li>
            </ul>
          </div>
        </section>

        {/* 세부 분석: 탭 */}
        <section className="rounded-2xl bg-white border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 pt-4">
            {["면접 집중도", "표정(경면 변화)", "답변 분석"].map((name) => (
              <button
                key={name}
                onClick={() => setTab(name)}
                className={`text-sm px-3 py-2 rounded-t-lg border-b-2 ${
                  tab === name
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-600 hover:text-gray-800"
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="px-8 py-5">
            {/* 컨텐츠 */}
            <div className="min-w-2">
              {/* 면접 집중도 */}
              {tab === "면접 집중도" && (
                <div className="md:col-span-2">
                  <FocusOnlySynced
                    visionChartData={visionChartData}
                    videoUrl={videoUrl}
                    poster={thumbUrl}
                    sttSegments={sttSegments}
                    sttTimeUnit="s"
                  />
                </div>
              )}

              {/* 표정(경면 변화): AES 단일 라인 + 상태바 + 히트 슬라이더 */}
              {tab === "표정(경면 변화)" && (
                <EmotionOnlySynced
                  emotionChartData={emotionChartData}
                  videoUrl={videoUrl}
                  poster={thumbUrl}
                />
              )}

              {/* 답변 분석 */}
              {tab === "답변 분석" && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                  {/* 헤더 라인 */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <SectionTitle>답변 분석</SectionTitle>
                      {typeof score === "number" && <Pill color="blue">스코어 {score}%</Pill>}
                    </div>
                    <div className="text-[11px] text-gray-500">개선 포인트와 요약을 확인해 보세요.</div>
                  </div>

                  {/* 개선 답변 카드 */}
                  <div className="rounded-lg border border-gray-100">
                    <details open className="group">
                      <summary className="list-none cursor-pointer select-none flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="text-[12px] font-medium text-gray-800">개선 답변</p>
                          <Pill>초안</Pill>
                        </div>
                        <svg
                          className="size-4 text-gray-400 transition-transform group-open:rotate-180"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </summary>

                      <div className="px-4 pb-4 pt-1">
                        <div className="rounded-md bg-gray-50/80 p-3 text-[13px] leading-relaxed text-gray-800 whitespace-pre-line">
                          {answer?.improved_answer || "제공된 개선 답변이 없습니다."}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <CopyButton text={answer?.improved_answer || ""} />
                        </div>
                      </div>
                    </details>
                  </div>

                  {/* Positive / Negative */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] font-medium text-emerald-900">👍 Positive</p>
                        <Pill color="green">강점</Pill>
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-emerald-900 whitespace-pre-line">
                        {answer?.positive || "-"}
                      </p>
                    </div>

                    <div className="rounded-lg border border-rose-100 bg-rose-50/60 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] font-medium text-rose-900">⚠️ Negative</p>
                        <Pill color="red">보완</Pill>
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-rose-900 whitespace-pre-line">
                        {answer?.negative || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 원본 JSON (필요 시만 펼쳐보기 — 성능 저하 방지) */}
        <details className="bg-gray-50 p-3 rounded border">
          <summary className="cursor-pointer text-sm">원본 JSON 보기</summary>
          <pre className="text-xs overflow-auto">{JSON.stringify(clip, null, 2)}</pre>
        </details>
      </main>
    </div>
  );
}
