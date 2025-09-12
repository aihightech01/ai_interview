import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

// 새로고침 대비: id로 재구성할 때 사용할 임시 데이터(실제는 API 호출)
const SESSIONS = [
  { id: 1, title: "자기소개 장점 (강점)은 무엇입니까?", date: "2024.02.27 15:58", kind: "실전 면접", duration: "00:33", status: "analyzing", tone: "dark" },
  { id: 2, title: "프로젝트에서 맡은 역할은?", date: "2024.02.27 15:58", kind: "실전 면접", duration: "00:33", status: "done", tone: "blue" },
  // ...
];

export default function SessionDetail() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { id } = useParams();

  // 1) 리스트에서 넘어온 경우: state.session 사용
  // 2) 새로고침 등으로 state 없음: id로 대체 조회(임시로 SESSIONS에서)
  const session = useMemo(() => {
    if (state?.session) return state.session;
    return SESSIONS.find(s => String(s.id) === String(id)) ?? null;
  }, [state, id]);

  const [tab, setTab] = useState("면접 집중도"); // 탭 상태

  if (!session) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">세션 정보를 찾을 수 없습니다.</p>
          <button onClick={() => navigate(-1)} className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white">돌아가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* 상단 바(간단) */}
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
          <p className="mt-1 text-sm text-gray-600">
            문항 “{session.title}”에 대한 결과입니다.
          </p>
          <div className="mt-3 text-xs text-gray-500">
            <span className="mr-2 px-2 py-0.5 rounded-md bg-gray-100 border">{session.kind}</span>
            <span className="mr-2">{session.date}</span>
            <span className="mr-2">영상 길이 {session.duration}</span>
          </div>
        </section>

        {/* 총평/포인트 2열 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-medium mb-3">총평</h3>
            <p className="text-sm text-gray-700">
              면접 합격 가능성 <span className="font-semibold text-blue-600">32%</span> (초기 준비 상태)<br/>
              영상/음성의 전반적 개선이 필요합니다. 분석 리포트를 참고해 개선하세요.
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
              시선 흔들림/표정 변화/발화 속도에서 개선 포인트가 감지되었습니다.
            </p>
          </div>
        </section>

        {/* 세부 분석: 탭 + 2열 + 하단 경고 박스 */}
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
            {/* 좌: 영상 미리보기 */}
            <div>
              <p className="text-xs text-gray-500 mb-2">실전 면접 영상 미리보기</p>
              <div className="aspect-video rounded-xl bg-[#0E1320] text-white flex items-center justify-center">
                {/* 실제는 <video controls src={session.videoUrl} /> 등으로 교체 */}
                <span className="opacity-60 text-sm">영상 플레이어 영역</span>
              </div>
            </div>

            {/* 우: 프레임별 자세/움직임 (placeholder) */}
            <div>
              <p className="text-xs text-gray-500 mb-2">프레임별 자세 움직임</p>
              <div className="h-48 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400">
                차트/지표 영역
              </div>
              <p className="mt-2 text-[11px] text-gray-500">종합평: 시선 이탈 경계, 말끊김 다소 높음</p>
            </div>

            {/* 하단 경고/권고 박스 */}
            <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 p-4">
              <p className="text-sm font-medium mb-1">프레임별 자세 움직임</p>
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
