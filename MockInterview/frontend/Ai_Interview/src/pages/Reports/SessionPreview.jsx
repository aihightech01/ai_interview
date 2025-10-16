// src/pages/Reports/SessionPreview.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom"; // ✅ useNavigate 추가
import api from "../../utils/axiosInstance";

export default function SessionPreview() {
  const { sessionId } = useParams(); // URL의 :sessionId
  const nav = useNavigate();          // ✅ 라우터 이동 훅
  const [clips, setClips] = useState([]); // [{questionNo, videoNo, ...}]
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let abort = false;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        // GET /user/profile/:sessionId
        const { data } = await api.get(`/user/profile/${sessionId}`);

        // data 형태 방어
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.clips)
            ? data.clips
            : [];

        if (!abort) setClips(list ?? []);
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

  // 파일 경로가 D:\... 이면 직접 표시 불가 → 서버에서 URL 내려줄 때 사용
  const toFileUrl = (p) => p;

  // ✅ 카드 클릭 시 UI 라우트로 이동 (/session/:sessionId/:videoNo)
  const goDetail = (clip) => {
    if (!clip?.videoNo) return;
    // 상세 페이지로 이동 + clip을 state로 넘겨 재요청 없이 렌더 가능
    nav(`/session/${sessionId}/${clip.videoNo}`, { state: { clip } });
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      {/* 상단 바 */}
      <header className=" top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <button onClick={() => nav(-1)} className="px-3 py-1 rounded hover:bg-gray-100">← 뒤로</button>
          <div className="text-sm text-gray-500">세션 #{sessionId} </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">

          {/* 헤더 */}
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900">면접 분석 결과</h2>
            <p className="text-sm text-gray-500 mt-1">세션 #{sessionId}</p>
          </div>

          {/* 종평 + 포인트 (임시) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-medium text-gray-700 mb-2">종평</h3>
              <p className="text-sm text-gray-600">
                영상/음성의 전달력 개선이 필요합니다. 분석 리포트를 참고해 개선하세요.
              </p>
            </section>
            <section className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-medium text-gray-700 mb-2">포인트</h3>
              <p className="text-sm text-gray-600">
                시선 흔들림/표정 변화/발화 속도에서 개선 포인트가 감지되었습니다.
              </p>
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
                    className={`rounded-2xl border border-gray-200 shadow-sm overflow-hidden bg-white hover:shadow-md transition text-left
                      ${!c.videoNo ? "opacity-50 cursor-not-allowed" : ""}`}
                    title={c.videoNo ? "" : "videoNo가 없어 이동할 수 없습니다"}
                  >
                    <div className="h-32 bg-blue-50">

                      {c.thumbnailDir && (
                        <img
                          src={toFileUrl(c.thumbnailDir)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )} 
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-gray-400 mb-1">Q{c.questionNo}</p>
                      <p className="text-sm font-medium text-gray-900">
                        {c.questionContent ?? c.content}
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
