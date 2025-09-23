// src/pages/Reports/SessionDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import api from "../../utils/axiosInstance";
import InteractiveEmotionChart from "../../components/InteractiveEmotionChart";

const SESSIONS = [
  { id: 1, title: "자기소개 장점 (강점)은 무엇입니까?", date: "2024.02.27 15:58", kind: "실전 면접", duration: "00:33", status: "analyzing", tone: "dark" },
  { id: 2, title: "프로젝트에서 맡은 역할은?", date: "2024.02.27 15:58", kind: "실전 면접", duration: "00:33", status: "done", tone: "blue" },
];

export default function SessionDetail() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { id } = useParams(); // /session/:id
  const [searchParams] = useSearchParams();

  // 세션 메타
  const session = useMemo(() => {
    if (state?.session) return state.session;
    return SESSIONS.find((s) => String(s.id) === String(id)) ?? null;
  }, [state, id]);

  // 어떤 질문 보여줄지: state → ?q
  const selectedFromStateQ = state?.selectedQuestionNo;
  const selectedFromQueryQ = searchParams.get("q");
  const questionNo = useMemo(() => {
    return selectedFromStateQ ?? (selectedFromQueryQ ? Number(selectedFromQueryQ) : null);
  }, [selectedFromStateQ, selectedFromQueryQ]);

  // 어떤 비디오로 가져올지: state → ?v → (없으면 목록에서 questionNo로 찾기)
  const selectedFromStateV = state?.selectedVideoNo;
  const selectedFromQueryV = searchParams.get("v");
  const [videoNo, setVideoNo] = useState(
    selectedFromStateV ?? (selectedFromQueryV ? Number(selectedFromQueryV) : null)
  );

  const [clips, setClips] = useState([]);
  const [resolveLoading, setResolveLoading] = useState(false);

  // videoNo가 없고 questionNo만 있으면, 세션 목록에서 찾아서 매핑
  useEffect(() => {
    let abort = false;
    if (videoNo || !questionNo) return;

    (async () => {
      try {
        setResolveLoading(true);
        const { data } = await api.get(`/user/profile/${id}`, {
          headers: { "Content-Type": "application/json" },
        });
        const list = Array.isArray(data) ? data : Array.isArray(data?.clips) ? data.clips : [];
        if (abort) return;
        setClips(list);

        const found = list.find((c) => Number(c.questionNo) === Number(questionNo));
        if (found?.videoNo) setVideoNo(Number(found.videoNo));
      } finally {
        if (!abort) setResolveLoading(false);
      }
    })();

    return () => { abort = true; };
  }, [id, questionNo, videoNo]);

  // 비디오 상세 로드
  const [qLoading, setQLoading] = useState(false);
  const [qErr, setQErr] = useState("");
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let abort = false;
    if (!videoNo) return;

    (async () => {
      try {
        setQLoading(true);
        setQErr("");
        // ★ 비디오 상세
        const { data } = await api.get(`/videos/stream/${videoNo}`, {
          headers: { "Content-Type": "application/json" },
        });

        if (abort) return;

        // 문자열 JSON 파싱
        const parsedAnswer = safeParse(data?.analysis?.answer);
        const parsedEmotion = safeParse(data?.analysis?.emotion);
        const parsedVision = safeParse(data?.analysis?.vision);

        setDetail({
          videoNo: data.videoNo,
          questionNo: data.questionNo,
          questionContent: data.questionContent,
          // 서버가 내려주는 스트림 URL 사용 (D:\ 경로는 브라우저 X)
          videoUrl: data.videoStreamUrl || data.videoDir,       // videoStreamUrl 권장
          thumbnailUrl: data.thumbnailDir,                      // 권장: 서버에서 HTTP로 바꿔주기
          answer: parsedAnswer,
          emotion: parsedEmotion,
          vision: parsedVision,
        });
      } catch (e) {
        if (!abort) setQErr("질문 상세 정보를 불러오지 못했습니다.");
      } finally {
        if (!abort) setQLoading(false);
      }
    })();

    return () => { abort = true; };
  }, [videoNo]);

  const [tab, setTab] = useState("면접 집중도");

  if (!session) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">세션 정보를 찾을 수 없습니다.</p>
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
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              세션 #{id}{questionNo ? ` · Q${questionNo}` : ""}{videoNo ? ` · V${videoNo}` : ""}
            </span>
            <button onClick={() => navigate(`/session/${id}/preview`)} className="px-3 py-2 rounded-lg text-sm hover:bg-gray-100">
              목록으로
            </button>
            <button onClick={() => navigate("/mypage")} className="px-3 py-2 rounded-lg text-sm hover:bg-gray-100">
              마이페이지
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        {/* 타이틀 */}
        <section className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold">프리뷰 분석 결과</h2>
          <p className="mt-1 text-sm text-gray-600">
            문항 “{detail?.questionContent ?? session.title}”에 대한 결과입니다.
          </p>
          <div className="mt-3 text-xs text-gray-500">
            <span className="mr-2 px-2 py-0.5 rounded-md bg-gray-100 border">{session.kind}</span>
            <span className="mr-2">{session.date}</span>
            <span className="mr-2">영상 길이 {session.duration}</span>
          </div>
        </section>

        {/* 총평/포인트 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-medium mb-3">총평</h3>
            <p className="text-sm text-gray-700">
              면접 합격 가능성 <span className="font-semibold text-blue-600">{detail?.answer?.score ?? 32}%</span>
              <br />영상/음성의 전반적 개선이 필요합니다. 분석 리포트를 참고해 개선하세요.
            </p>
            <div className="mt-3">
              <span className="inline-flex items-center text-[11px] px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">
                면접 준비: 부족함
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-medium mb-3">포인트</h3>
            <p className="text-sm text-gray-700">
              {detail?.answer?.positive || "시선 흔들림/표정 변화/발화 속도에서 개선 포인트가 감지되었습니다."}
            </p>
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
                  tab === name ? "border-blue-600 text-blue-700" : "border-transparent text-gray-600 hover:text-gray-800"
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
              <div className="aspect-video rounded-xl bg-[#0E1320] text-white flex items-center justify-center">
                {resolveLoading || qLoading ? (
                  <span className="opacity-60 text-sm">로딩 중…</span>
                ) : detail?.videoUrl ? (
                  <video className="w-full rounded-xl" controls src={detail.videoUrl} poster={detail.thumbnailUrl} />
                ) : (
                  <span className="opacity-60 text-sm">영상 없음</span>
                )}
              </div>
              {qErr && <p className="mt-2 text-xs text-red-500">{qErr}</p>}
            </div>

            {/* 우: 프레임별 분석 (예: 감정/시선) */}
            <div>
              <p className="text-xs text-gray-500 mb-2">프레임별 분석</p>
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <InteractiveEmotionChart data={detail?.emotion ?? []} />
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                {detail?.answer?.negative ? `보완점: ${detail.answer.negative}` : "종합평: 시선 이탈 경계, 말끊김 다소 높음"}
              </p>
            </div>

            {/* 하단 권고 */}
            <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 p-4">
              <p className="text-sm font-medium mb-1">권고</p>
              <p className="text-sm">
                상체의 좌우 흔들림이 뚜렷합니다. 의자/카메라 위치를 재조정하고 답변 전에 호흡을 정돈하세요.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// 안전 파서
function safeParse(v) {
  if (!v) return null;
  try {
    return typeof v === "string" ? JSON.parse(v) : v;
  } catch {
    return null;
  }
}
