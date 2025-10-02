// src/pages/Reports/SessionDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ReferenceArea,   // ★ 추가
  Brush,
  ComposedChart,    // ★ (선택) 미니 점수 트랙용
  Bar,              // ★ (선택) 미니 점수 트랙용
} from "recharts";

import ChartDraggable from "../../components/ChartDraggable";
import { parseEmotion, toEmotionChartData } from "../../utils/transformEmotion";

/** 공통: 안전 파싱 */
function safeParseJSON(maybeJSON, fallback = null) {
  try {
    if (maybeJSON == null) return fallback;
    if (typeof maybeJSON === "string") return JSON.parse(maybeJSON);
    return maybeJSON;
  } catch {
    return fallback;
  }
}

/** 이중 인코딩까지 커버하는 안전 파싱 */
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

/** Top label 분포 요약 */
function summarizeTopLabels(emotions) {
  if (!Array.isArray(emotions)) return { counts: {}, total: 0 };
  const counts = {};
  for (const e of emotions) {
    const k = e.top_label || "unknown";
    counts[k] = (counts[k] || 0) + 1;
  }
  return { counts, total: emotions.length };
}

/** 절대 URL 만들지 않고, 슬래시만 보정 */
function toPath(p) {
  if (!p) return "";
  const lower = String(p).toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("blob:")) return p;
  if (lower.startsWith("file:")) return "";
  if (/[A-Za-z]:\\/.test(p)) return "";
  return p.startsWith("/") ? p : `/${p}`;
}

/** vision → 차트용 가공 (라디안 추정 시 °로 변환, tSec 추가, score 포함) */
function toVisionChartData(visionRaw, fps = 30, opts = { maWindow: 0 }) {
  const f = Math.max(1, Number(fps) || 30);
  const RAD2DEG = 180 / Math.PI;
  if (!Array.isArray(visionRaw)) return [];

  const base = visionRaw.map((d) => {
    const frame = Number(d.frame);
    const headYaw = Number(d.head_yaw);
    const headPitch = Number(d.head_pitch);
    let gazeYaw = Number(d.gaze_yaw);
    let gazePitch = Number(d.gaze_pitch);
    let score = d.score != null ? Number(d.score) : null;

    // 값 크기로 라디안 추정 → ° 변환
    if (Math.abs(gazeYaw) < 3 && Math.abs(gazePitch) < 3) {
      gazeYaw *= RAD2DEG;
      gazePitch *= RAD2DEG;
    }
    // score 정규화(0~100)
    if (Number.isFinite(score)) {
      score = Math.max(0, Math.min(100, score));
    } else {
      score = null;
    }

    return {
      frame,
      tSec: frame / f,
      headYaw,
      headPitch,
      gazeYaw,
      gazePitch,
      score, // ★ 추가
    };
  });

  // (선택) 이동평균
  const w = Number(opts?.maWindow) || 0;
  if (w > 1) {
    const half = Math.floor(w / 2);
    for (let i = 0; i < base.length; i++) {
      let sum = 0, cnt = 0;
      for (let j = i - half; j <= i + half; j++) {
        if (j >= 0 && j < base.length && base[j].score != null) {
          sum += base[j].score; cnt++;
        }
      }
      base[i].score_ma = cnt ? sum / cnt : null;
    }
  }
  return base;
}

/** 10프레임 단위(score) → 구간/스텝 시리즈 생성 (계단 그래프용) */
function buildScoreSegments(visionRaw, binSize = 10, fps = 30) {
  if (!Array.isArray(visionRaw) || !visionRaw.length) return { segments: [], stepSeries: [] };

  // 대표 프레임(10,20,30…) 점수만 묶기
  const map = new Map(); // key: binStart, val: score
  for (const d of visionRaw) {
    const frame = Number(d.frame);
    const score = Number(d.score);
    if (!Number.isFinite(frame) || !Number.isFinite(score)) continue;
    const binStart = Math.floor(frame / binSize) * binSize;
    map.set(binStart, Math.max(0, Math.min(100, score)));
  }
  if (map.size === 0) return { segments: [], stepSeries: [] };

  // 구간 리스트 [start, end)
  const starts = Array.from(map.keys()).sort((a, b) => a - b);
  const maxFrame = Math.max(...visionRaw.map(v => Number(v.frame) || 0));
  const segments = [];
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    const e = (i < starts.length - 1)
      ? starts[i + 1]
      : (Math.floor((maxFrame + binSize) / binSize) * binSize);
    const score = map.get(s);
    segments.push({
      startFrame: s,
      endFrame: e,
      score,
      tStart: s / fps,
      tEnd: e / fps,
    });
  }

  // 스텝 라인 포인트(각 구간 시작/끝 두 점)
  const stepSeries = [];
  for (const seg of segments) {
    stepSeries.push({ frame: seg.startFrame, score: seg.score });
    stepSeries.push({ frame: seg.endFrame, score: seg.score });
  }
  return { segments, stepSeries };
}

/** 초 → 00:03.3 같은 포맷 */
function formatTime(sec) {
  const m = Math.floor(sec);
  const s = (sec - m).toFixed(1);
  const mm = Math.floor(m / 60);
  const ss = (m % 60) + s.slice(1);
  return `${String(mm).padStart(2, "0")}:${ss.padStart(4, "0")}`;
}

export default function SessionDetail() {
  const { state } = useLocation();
  const nav = useNavigate();
  const { sessionId, videoNo } = useParams();

  const [clip, setClip] = useState(state?.clip ?? null);
  const [loading, setLoading] = useState(!state?.clip);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("면접 집중도");
  const [cursorTime, setCursorTime] = useState(0);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const url = API_PATHS.USER.PROFILE_DETAIL(sessionId, videoNo);
        const { data } = await api.get(url);
        if (!ignore) setClip(prev => ({ ...(prev || {}), ...(data || {}) }));
      } catch (e) {
        if (!ignore) setErr("분석 데이터를 불러오지 못했습니다.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [sessionId, videoNo]);

  // 분석 파싱
  const analysis = useMemo(() => {
    const parsed = parseJSONDeep(clip?.analysis, {}) || {};
    return parsed;
  }, [clip]);

  // vision: 문자열/배열 모두 커버
  const visionRaw = useMemo(() => {
    const v = parseJSONDeep(analysis?.vision, []);
    return Array.isArray(v) ? v : [];
  }, [analysis]);

  const FPS = 30;

  // ★ Vision 차트 데이터(+score, (옵션) MA 적용)
  const visionChartData = useMemo(
    () => toVisionChartData(visionRaw, FPS, { maWindow: 0 }),
    [visionRaw]
  );

  // ★ 10프레임 단위 점수 세그먼트 & 스텝 시리즈
  const { segments: scoreSegments, stepSeries: scoreStep } = useMemo(
    () => buildScoreSegments(visionRaw, 10, FPS),
    [visionRaw]
  );

  // emotion/answer
  const emotions = useMemo(() => parseEmotion(analysis?.emotion), [analysis]);
  const answer = useMemo(() => safeParseJSON(analysis?.answer, {}) || {}, [analysis]);
  const emotionChartData = useMemo(() => toEmotionChartData(emotions, 30), [emotions]);
  const emotionSummary = useMemo(() => summarizeTopLabels(emotions), [emotions]);

  // score(답변 스코어) 안전 파싱
  const score = useMemo(() => {
    if (answer?.score == null) return null;
    const n = Number(answer.score);
    return Number.isFinite(n) ? n : null;
  }, [answer]);

  // 비디오/썸네일 경로
  let videoUrl = "";
  if (clip?.videoNo != null) {
    videoUrl = toPath(API_PATHS?.VIDEOS?.STREAM?.(clip.videoNo));
  } else if (clip?.videoStreamUrl) {
    const templated = clip.videoStreamUrl;
    const resolved = templated.includes("{videoNo}")
      ? templated.replace("{videoNo}", String(videoNo ?? ""))
      : templated;
    videoUrl = toPath(resolved);
  }
  const thumbUrl = toPath(clip?.thumbnailDir);

  if (loading) return <div className="p-6">로딩중…</div>;
  if (err || !clip) {
    return (
      <div className="p-6">
        {err || "데이터가 없습니다."}
        <button onClick={() => nav(-1)} className="ml-2 underline">뒤로</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* 상단 바 */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <button onClick={() => nav(-1)} className="px-3 py-1 rounded hover:bg-gray-100">← 뒤로</button>
          <div className="text-sm text-gray-500">세션 #{sessionId} / 비디오 #{videoNo}</div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        {/* 타이틀 */}
        <section className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold">프리뷰 분석 결과</h2>
          <p className="mt-1 text-sm text-gray-600">문항 “{clip.questionContent ?? `Q${clip.questionNo}`}”에 대한 결과입니다.</p>
          <div className="mt-3 text-xs text-gray-500 flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-gray-100 border">영상번호 #{clip.videoNo ?? videoNo}</span>
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
              <li>10프레임 단위 집중도(Score) 저하 구간 확인</li>
              <li>개선 포인트를 다음 답변 스크립트에 반영</li>
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
                className={`text-sm px-3 py-2 rounded-t-lg border-b-2 ${tab === name ? "border-blue-600 text-blue-700" : "border-transparent text-gray-600 hover:text-gray-800"}`}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
            {/* 좌: 영상 */}
            <div>
              <p className="text-xs text-gray-500 mb-2">실전 면접 영상</p>
              <div className="aspect-video overflow-hidden rounded-xl bg-black/90 text-white flex items-center justify-center">
                {videoUrl ? (
                  <video
                    className="w-full h-full"
                    controls
                    preload="metadata"
                    poster={thumbUrl || undefined}
                    src={videoUrl}
                  />
                ) : (
                  <span className="opacity-60 text-sm">영상 소스가 없습니다.</span>
                )}
              </div>
            </div>

            {/* 우: 탭 컨텐츠 */}
            <div className="min-w-0">
              {/* 면접 집중도 (Vision + Score[10f]) */}
              {tab === "면접 집중도" && (
                <>
                  <p className="text-xs text-gray-500 mb-2">프레임별 시선/머리 각도 + 10프레임 단위 집중도</p>
                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    {visionChartData.length ? (
                      <>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={visionChartData} margin={{ top: 10, right: 24, bottom: 10, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="frame"
                              tick={{ fontSize: 11 }}
                              tickFormatter={(f) => formatTime(Number(f) / FPS)}
                            />
                            {/* 왼쪽: 각도(°) */}
                            <YAxis yAxisId="deg" tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                            {/* 오른쪽: 점수(%) */}
                            <YAxis yAxisId="score" orientation="right" tick={{ fontSize: 11 }} domain={[0, 100]} />

                            <Tooltip
                              formatter={(v, name, ctx) => {
                                const key = ctx?.dataKey;
                                if (key === "score" || key === "scoreStep" || key === "score_ma")
                                  return [`${Number(v).toFixed(0)}%`, name];
                                return [`${Number(v).toFixed(2)}°`, name];
                              }}
                              labelFormatter={(f) => `frame ${f} (${formatTime(Number(f) / FPS)})`}
                            />
                            <Legend />

                            {/* 기준선 */}
                            <ReferenceLine y={0} yAxisId="deg" stroke="#999" strokeDasharray="4 3" />
                            <ReferenceLine y={70} yAxisId="score" stroke="#22c55e" strokeDasharray="4 3" />
                            <ReferenceLine y={40} yAxisId="score" stroke="#f59e0b" strokeDasharray="4 3" />

                            {/* ★ 점수 구간 배경 하이라이트 */}
                            {scoreSegments.map((seg, i) => {
                              const fill =
                                seg.score < 40 ? "#ef44441a" :
                                seg.score < 70 ? "#f59e0b1a" :
                                null;
                              if (!fill) return null;
                              return (
                                <ReferenceArea
                                  key={`seg-${i}`}
                                  x1={seg.startFrame}
                                  x2={seg.endFrame}
                                  yAxisId="deg"
                                  strokeOpacity={0}
                                  fill={fill}
                                />
                              );
                            })}

                            {/* 각도 라인 */}
                            {/*<Line yAxisId="deg" type="monotone" dataKey="headYaw"   name="Head Yaw"   dot={false} stroke="#2563eb" strokeWidth={2} />
                            <Line yAxisId="deg" type="monotone" dataKey="gazeYaw"   name="Gaze Yaw"   dot={false} stroke="#16a34a" strokeWidth={2} />
                            <Line yAxisId="deg" type="monotone" dataKey="headPitch" name="Head Pitch" dot={false} stroke="#7c3aed" strokeWidth={1.5} />
                            <Line yAxisId="deg" type="monotone" dataKey="gazePitch" name="Gaze Pitch" dot={false} stroke="#ea580c" strokeWidth={1.5} />
                            <Line yAxisId="deg" type="monotone" dataKey="score" name="score" dot={false} stroke="#fa5700ff" strokeWidth={1.5} />

                            {/* ★ 10프레임 단위 점수 스텝 라인 */}
                            {scoreStep.length > 0 && (
                              <Line
                                yAxisId="score"
                                //name="Focus Score(10f)"
                                type="stepAfter"
                                data={scoreStep}
                                dataKey="score"
                                dot={false}
                                stroke="#e90e95ff"
                                strokeWidth={1.6}
                                isAnimationActive={false}
                              />
                            )}

                            <Brush dataKey="frame" height={16} travellerWidth={8} />
                          </LineChart>
                        </ResponsiveContainer>


                      </>
                    ) : (
                      <div className="text-xs text-gray-500">
                        표시할 시선/머리각 데이터가 없습니다. (vision length: {Array.isArray(visionRaw) ? visionRaw.length : 0})
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* 표정(경면 변화) */}
              {tab === "표정(경면 변화)" && (
                <>
                  <p className="text-xs text-gray-500 mb-2">프레임별 감정 확률(%)</p>
                  <div className="rounded-xl border border-gray-200 bg-white p-3 min-w-0">
                    {emotionChartData.length ? (
                      <ChartDraggable
                        data={emotionChartData}
                        duration={emotionChartData.at(-1)?.t || 0}
                        cursorTime={cursorTime}
                        onChangeTime={setCursorTime}
                        series={["neutral", "happy", "sad", "angry", "fear", "disgust", "surprise"]}
                        yDomain={[0, 100]}
                      />
                    ) : (
                      <div className="text-xs text-gray-500">표시할 감정 데이터가 없습니다.</div>
                    )}
                  </div>

                  {/* Top label 분포(요약) */}
                  <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                    {emotionSummary.total > 0 ? (
                      <ul className="list-disc pl-4 text-sm text-gray-700 space-y-1">
                        {Object.entries(emotionSummary.counts).map(([k, v]) => {
                          const ratio = Math.round((v / emotionSummary.total) * 100);
                          return (
                            <li key={k}>
                              {k}: {v}프레임 ({ratio}%)
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="text-xs text-gray-500">요약할 감정 레이블이 없습니다.</div>
                    )}
                  </div>
                </>
              )}

              {/* 답변 분석 */}
              {tab === "답변 분석" && (
                <>
                  <p className="text-xs text-gray-500 mb-2">AI 답변 코칭</p>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-800 space-y-3">
                    <div>
                      <p className="text-[11px] text-gray-500">개선 답변</p>
                      <p className="mt-1 whitespace-pre-line">{answer?.improved_answer || "제공된 개선 답변이 없습니다."}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                        <p className="text-[12px] font-medium text-green-800">👍 Positive</p>
                        <p className="mt-1 text-[13px] text-green-900 whitespace-pre-line">{answer?.positive || "-"}</p>
                      </div>
                      <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                        <p className="text-[12px] font-medium text-red-800">⚠️ Negative</p>
                        <p className="mt-1 text-[13px] text-red-900 whitespace-pre-line">{answer?.negative || "-"}</p>
                      </div>
                    </div>
                    {typeof score === "number" && (
                      <div className="text-[12px] text-gray-600">
                        스코어: <span className="font-semibold">{score}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* 하단 권고/주의 */}
            <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 p-4">
              <p className="text-sm font-medium mb-1">권고사항</p>
              <p className="text-sm">
                시선 이탈/좌우 흔들림 구간이 감지됩니다. 카메라를 눈높이에 맞추고, 문장 사이 호흡-멈춤(0.5~1s)을 넣어 안정감을 주세요.
              </p>
            </div>
          </div>
        </section>

        {/* 개발 편의: 원본 JSON */}
        <details className="bg-gray-50 p-3 rounded border">
          <summary className="cursor-pointer text-sm">원본 JSON 보기</summary>
          <pre className="text-xs overflow-auto">{JSON.stringify(clip, null, 2)}</pre>
        </details>
      </main>
    </div>
  );
}
