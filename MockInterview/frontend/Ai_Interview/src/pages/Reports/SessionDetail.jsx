import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../../utils/axiosInstance";
import InteractiveEmotionChart from "../../components/InteractiveEmotionChart";

/** 유틸: JSON이 문자열로 올 때 안전 파싱 */
function safeParseJSON(maybeJSON, fallback = null) {
  try {
    if (maybeJSON == null) return fallback;
    if (typeof maybeJSON === "string") return JSON.parse(maybeJSON);
    return maybeJSON; // 이미 객체/배열
  } catch (_) {
    return fallback;
  }
}

/** 비전 데이터 전처리: 각 프레임의 시선/머리각을 시계열로 */
function mapVisionSeries(visionArr) {
  if (!Array.isArray(visionArr)) return { frames: [], headYaw: [], headPitch: [], gazeYaw: [], gazePitch: [] };
  const frames = visionArr.map(v => v.frame);
  const headYaw = visionArr.map(v => v.head_yaw);
  const headPitch = visionArr.map(v => v.head_pitch);
  const gazeYaw = visionArr.map(v => v.gaze_yaw);
  const gazePitch = visionArr.map(v => v.gaze_pitch);
  return { frames, headYaw, headPitch, gazeYaw, gazePitch };
}

/** 감정 데이터 전처리: frame_idx 기준으로 주요 감정 시계열 만들기 */
function mapEmotionSeries(emotionArr) {
  if (!Array.isArray(emotionArr)) return { x: [], neutral: [], happy: [], sad: [], angry: [], fear: [], disgust: [], surprise: [], top: [] };
  const x = emotionArr.map(e => e.frame_idx);
  const pick = key => emotionArr.map(e => Number(e[key] ?? 0));
  return {
    x,
    neutral: pick("neutral"),
    happy: pick("happy"),
    sad: pick("sad"),
    angry: pick("angry"),
    fear: pick("fear"),
    disgust: pick("disgust"),
    surprise: pick("surprise"),
    top: emotionArr.map(e => e.top_label)
  };
}

export default function SessionDetail() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { id } = useParams(); // 필요시 /reports/:id 같은 라우트에서 사용

  // 화면 상태
  const [tab, setTab] = useState("면접 집중도");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 서버에서 받아온 단일 클립(문항) 데이터
  const [clip, setClip] = useState(() => state?.clip ?? null);

  // 1) state로 전달받은 경우 그대로 사용
  // 2) 새로고침으로 state가 없으면 :id로 API 재호출 (예: /user/profile/:sessionId 에서 하위 videoNo=/:id 조회)
  useEffect(() => {
    if (clip) return; // 이미 있음
    if (!id) return;  // id 없이 단독 페이지 접근한 경우는 스킵

    (async () => {
      try {
        setLoading(true);
        setError("");
        // ⚠️ 예시: 백엔드에 실제 맞는 조회 API로 교체하세요.
        // 여기서는 비디오 단건을 불러오는 가상의 엔드포인트를 예시로 둡니다.
        const { data } = await api.get(`/videos/${id}`);
        setClip(data);
      } catch (e) {
        console.error(e);
        setError("분석 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ====== 파생 데이터 ======
  const analysis = useMemo(() => safeParseJSON(clip?.analysis, clip?.analysis ?? null), [clip]);
  const emotions = useMemo(() => safeParseJSON(analysis?.emotion, analysis?.emotion ?? []), [analysis]);
  const vision = useMemo(() => safeParseJSON(analysis?.vision, analysis?.vision ?? []), [analysis]);
  const answerEval = useMemo(() => safeParseJSON(analysis?.answer, analysis?.answer ?? {}), [analysis]);

  const emotionSeries = useMemo(() => mapEmotionSeries(emotions), [emotions]);
  const visionSeries = useMemo(() => mapVisionSeries(vision), [vision]);

  const videoUrl = clip?.videoStreamUrl || clip?.videoDir || "";
  const thumbUrl = clip?.thumbnailDir || "";

  // 요약 점수(예: 답변 스코어)
  const score = Number(answerEval?.improved_answer ? (answerEval?.score ?? 0) : 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">로딩 중…</p>
      </div>
    );
  }

  if (error || !clip) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{error || "세션 정보를 찾을 수 없습니다."}</p>
          <button onClick={() => navigate(-1)} className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white">
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* 상단 바 */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="font-semibold">AI 면접 코치</button>
          <button onClick={() => navigate("/mypage")} className="px-3 py-2 rounded-lg text-sm hover:bg-gray-100">마이페이지</button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        {/* 타이틀 박스 */}
        <section className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold">프리뷰 분석 결과</h2>
          <p className="mt-1 text-sm text-gray-600">문항 “{clip?.questionContent ?? `질문 #${clip?.questionNo}`}”에 대한 결과입니다.</p>
          <div className="mt-3 text-xs text-gray-500 flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-gray-100 border">영상번호 #{clip?.videoNo}</span>
            {score ? (<span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">답변 점수 {score}%</span>) : null}
          </div>
        </section>

        {/* 총평/포인트 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-medium mb-3">총평</h3>
            {score ? (
              <p className="text-sm text-gray-700">
                합격 가능성 지표 <span className="font-semibold text-blue-600">{score}%</span>
              </p>
            ) : (
              <p className="text-sm text-gray-700">분석 스코어가 준비 중이거나 제공되지 않았습니다.</p>
            )}
            <div className="mt-3">
              <span className="inline-flex items-center text-[11px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                카메라 정면 시선 유지 & 천천히 또박또박
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-medium mb-3">포인트</h3>
            <ul className="text-sm text-gray-700 list-disc pl-4 space-y-1">
              <li>시선 각도(head/gaze)의 점진적 변화 파악</li>
              <li>프레임별 표정 분포로 긴장/침착 구간 식별</li>
              <li>답변 개선안 확인 후 자기소개/경험 답안에 반영</li>
            </ul>
          </div>
        </section>

        {/* 세부 분석 */}
        <section className="rounded-2xl bg-white border border-gray-200 shadow-sm">
          {/* 탭 */}
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
            {/* 좌: 영상 미리보기 */}
            <div>
              <p className="text-xs text-gray-500 mb-2">실전 면접 영상 미리보기</p>
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

            {/* 우: 차트/시계열 */}
            <div>
              {tab === "면접 집중도" && (
                <>
                  <p className="text-xs text-gray-500 mb-2">프레임별 시선/머리 각도 변화</p>
                  {/* 기존 컴포넌트로 대체하거나 아래 간단표현 유지 */}
                  <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[11px] text-gray-500 mb-1">Head Yaw (°)</p>
                        <div className="max-h-24 overflow-auto text-xs bg-gray-50 border rounded p-2">
                          {visionSeries.headYaw.slice(0, 50).map((v, i) => (
                            <div key={i}>f{visionSeries.frames[i]}: {v.toFixed(2)}</div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-500 mb-1">Gaze Yaw (°)</p>
                        <div className="max-h-24 overflow-auto text-xs bg-gray-50 border rounded p-2">
                          {visionSeries.gazeYaw.slice(0, 50).map((v, i) => (
                            <div key={i}>f{visionSeries.frames[i]}: {v.toFixed(2)}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-gray-500">샘플 50프레임까지 표시 (실제는 라인차트 권장)</p>
                  </div>
                </>
              )}

              {tab === "표정(경면 변화)" && (
                <>
                  <p className="text-xs text-gray-500 mb-2">프레임별 감정 분포</p>
                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    {/* 기존 InteractiveEmotionChart가 props를 받도록 되어 있으면 아래처럼 전달 */}
                    <InteractiveEmotionChart data={emotions} />
                    <p className="mt-2 text-[11px] text-gray-500">top label 샘플: {emotionSeries.top?.slice(0, 12).join(", ")}</p>
                  </div>
                </>
              )}

              {tab === "답변 분석" && (
                <>
                  <p className="text-xs text-gray-500 mb-2">AI 답변 코칭</p>
                  <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-800 space-y-3">
                    <div>
                      <p className="text-[11px] text-gray-500">개선 답변</p>
                      <p className="mt-1 whitespace-pre-line">{answerEval?.improved_answer || "제공된 개선 답변이 없습니다."}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                        <p className="text-[12px] font-medium text-green-800">👍 Positive</p>
                        <p className="mt-1 text-[13px] text-green-900 whitespace-pre-line">{answerEval?.positive || "강점 요약 없음"}</p>
                      </div>
                      <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                        <p className="text-[12px] font-medium text-red-800">⚠️ Negative</p>
                        <p className="mt-1 text-[13px] text-red-900 whitespace-pre-line">{answerEval?.negative || "보완점 요약 없음"}</p>
                      </div>
                    </div>
                    {typeof answerEval?.score !== "undefined" && (
                      <div className="text-[12px] text-gray-600">스코어: <span className="font-semibold">{answerEval.score}</span></div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* 하단 권고/주의 */}
            <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 p-4">
              <p className="text-sm font-medium mb-1">권고사항</p>
              <p className="text-sm">상체 좌/우 흔들림 및 시선 이탈 구간이 감지됩니다. 카메라 높이를 눈높이에 맞추고, 문장 사이 호흡-멈춤(0.5~1s)을 넣어 안정감을 주세요.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
