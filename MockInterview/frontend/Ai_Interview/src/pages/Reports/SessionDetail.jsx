// src/pages/Reports/SessionDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../../utils/axiosInstance";

/** 문자열/객체 안전 파싱 */
function safeParseJSON(maybeJSON, fallback = null) {
  try {
    if (maybeJSON == null) return fallback;
    if (typeof maybeJSON === "string") return JSON.parse(maybeJSON);
    return maybeJSON; // 이미 객체/배열
  } catch {
    return fallback;
  }
}

/** 비전 시계열 전처리 */
function mapVisionSeries(visionArr) {
  if (!Array.isArray(visionArr))
    return { frames: [], headYaw: [], headPitch: [], gazeYaw: [], gazePitch: [] };
  const frames = visionArr.map(v => v.frame);
  return {
    frames,
    headYaw: visionArr.map(v => v.head_yaw),
    headPitch: visionArr.map(v => v.head_pitch),
    gazeYaw: visionArr.map(v => v.gaze_yaw),
    gazePitch: visionArr.map(v => v.gaze_pitch),
  };
}

/** 감정 요약(최상 라벨 비율) */
function summarizeTopLabels(emotions) {
  if (!Array.isArray(emotions)) return { counts: {}, total: 0 };
  const counts = {};
  emotions.forEach(e => {
    const k = e.top_label || "unknown";
    counts[k] = (counts[k] || 0) + 1;
  });
  return { counts, total: emotions.length };
}

export default function SessionDetail() {
  const { state } = useLocation();
  const nav = useNavigate();
  const { sessionId, videoNo } = useParams();

  const [clip, setClip] = useState(state?.clip ?? null);
  const [loading, setLoading] = useState(!state?.clip);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("면접 집중도");

  useEffect(() => {
    if (clip) return; // state로 받았으면 재요청 X
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const { data } = await api.get(`/user/profile/${sessionId}/${videoNo}`);
        setClip(data);
      } catch {
        setErr("분석 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, videoNo, clip]);

  if (loading) return <div className="p-6">로딩중…</div>;
  if (err || !clip)
    return (
      <div className="p-6">
        {err || "데이터가 없습니다."}
        <button onClick={() => nav(-1)} className="ml-2 underline">
          뒤로
        </button>
      </div>
    );

  // ====== 분석 파싱 ======
  const analysis = useMemo(() => safeParseJSON(clip.analysis, clip.analysis ?? {}), [clip]);
  const emotions = useMemo(() => safeParseJSON(analysis?.emotion, []), [analysis]);
  const vision = useMemo(() => safeParseJSON(analysis?.vision, []), [analysis]);
  const answer = useMemo(() => safeParseJSON(analysis?.answer, {}), [analysis]);

  const visionSeries = useMemo(() => mapVisionSeries(vision), [vision]);
  const emotionSummary = useMemo(() => summarizeTopLabels(emotions), [emotions]);
  const score = typeof answer?.score === "number" ? answer.score : null;

  const videoUrl = clip.videoStreamUrl || clip.videoDir || "";
  const thumbUrl = clip.thumbnailDir || "";

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* 상단 바 */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <button onClick={() => nav(-1)} className="px-3 py-1 rounded hover:bg-gray-100">
            ← 뒤로
          </button>
          <div className="text-sm text-gray-500">세션 #{sessionId} / 비디오 #{videoNo}</div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        {/* 타이틀 박스 */}
        <section className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold">프리뷰 분석 결과</h2>
          <p className="mt-1 text-sm text-gray-600">
            문항 “{clip.questionContent ?? `Q${clip.questionNo}`}”에 대한 결과입니다.
          </p>
          <div className="mt-3 text-xs text-gray-500 flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-gray-100 border">
              영상번호 #{clip.videoNo ?? videoNo}
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
            <div className="mt-3">
              <span className="inline-flex items-center text-[11px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                카메라 정면 시선 유지 & 천천히 또박또박
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-medium mb-2">포인트</h3>
            <ul className="text-sm text-gray-700 list-disc pl-4 space-y-1">
              <li>시선 각도(head/gaze)의 점진적 변화 파악</li>
              <li>프레임별 표정 분포로 긴장/침착 구간 식별</li>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
            {/* 좌: 영상 */}
            <div>
              <p className="text-xs text-gray-500 mb-2">실전 면접 영상</p>
              <div className="aspect-video overflow-hidden rounded-xl bg-black/90 text-white flex items-center justify-center">
                {videoUrl ? (
                  <video
                    className="w-full h-full"
                    controls
                    poster={thumbUrl || undefined}
                    src={videoUrl}
                  />
                ) : (
                  <span className="opacity-60 text-sm">영상 소스가 없습니다.</span>
                )}
              </div>
            </div>

            {/* 우: 탭 컨텐츠 */}
            <div>
              {tab === "면접 집중도" && (
                <>
                  <p className="text-xs text-gray-500 mb-2">프레임별 시선/머리 각도 변화</p>
                  <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[11px] text-gray-500 mb-1">Head Yaw (°)</p>
                        <div className="max-h-28 overflow-auto text-xs bg-gray-50 border rounded p-2">
                          {visionSeries.headYaw.slice(0, 60).map((v, i) => (
                            <div key={i}>
                              f{visionSeries.frames[i]}: {Number(v).toFixed(2)}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-500 mb-1">Gaze Yaw (°)</p>
                        <div className="max-h-28 overflow-auto text-xs bg-gray-50 border rounded p-2">
                          {visionSeries.gazeYaw.slice(0, 60).map((v, i) => (
                            <div key={i}>
                              f{visionSeries.frames[i]}: {Number(v).toFixed(2)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-gray-500">
                      샘플 60프레임까지 표시 (실서비스에선 라인차트 권장)
                    </p>
                  </div>
                </>
              )}

              {tab === "표정(경면 변화)" && (
                <>
                  <p className="text-xs text-gray-500 mb-2">프레임별 감정 분포 (Top Label)</p>
                  <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700">
                    {emotionSummary.total > 0 ? (
                      <ul className="list-disc pl-4 space-y-1">
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
                      <div className="text-xs text-gray-500">표시할 감정 데이터가 없습니다.</div>
                    )}
                    <p className="mt-2 text-[11px] text-gray-500">
                      예: neutral 비중이 높으면 안정적 톤, sad/angry가 길게 연속되면 표정 관리 필요
                    </p>
                  </div>
                </>
              )}

              {tab === "답변 분석" && (
                <>
                  <p className="text-xs text-gray-500 mb-2">AI 답변 코칭</p>
                  <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-800 space-y-3">
                    <div>
                      <p className="text-[11px] text-gray-500">개선 답변</p>
                      <p className="mt-1 whitespace-pre-line">
                        {answer?.improved_answer || "제공된 개선 답변이 없습니다."}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                        <p className="text-[12px] font-medium text-green-800">👍 Positive</p>
                        <p className="mt-1 text-[13px] text-green-900 whitespace-pre-line">
                          {answer?.positive || "-"}
                        </p>
                      </div>
                      <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                        <p className="text-[12px] font-medium text-red-800">⚠️ Negative</p>
                        <p className="mt-1 text-[13px] text-red-900 whitespace-pre-line">
                          {answer?.negative || "-"}
                        </p>
                      </div>
                    </div>
                    {score !== null && (
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
                시선 이탈/좌우 흔들림 구간이 감지됩니다. 카메라를 눈높이에 맞추고, 문장 사이 호흡-멈춤(0.5~1s)을
                넣어 안정감을 주세요.
              </p>
            </div>
          </div>
        </section>

        {/* 개발 편의: 원본 JSON 보기 */}
        <details className="bg-gray-50 p-3 rounded border">
          <summary className="cursor-pointer text-sm">원본 JSON 보기</summary>
          <pre className="text-xs overflow-auto">{JSON.stringify(clip, null, 2)}</pre>
        </details>
      </main>
    </div>
  );
}
