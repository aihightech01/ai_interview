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
  if (lower.startsWith("file:")) return "";
  if (/[A-Za-z]:\\/.test(s)) return ""; // D:\... 같은 로컬 경로 차단
  return s.startsWith("/") ? s : `/${s}`;
}

/** clip → 비디오 스트림 URL 생성 (SessionDetail 방식 그대로, 로깅 포함) */
function getVideoUrlFromClip(c) {
  const no = c?.videoNo ?? c?.videoNO ?? c?.videono ?? c?.VideoNo ?? null;

  if (no != null && API_PATHS?.VIDEOS?.STREAM) {
    const url = toPath(API_PATHS.VIDEOS.STREAM(no));
    //console.debug("🎬 [getVideoUrlFromClip] STREAM(no) 사용", { no, url });
    return url;
  }

  if (c?.videoStreamUrl) {
    const t = c.videoStreamUrl;
    const resolved = t.includes("{videoNo}") ? t.replace("{videoNo}", String(no ?? "")) : t;
    const url = toPath(resolved);
    // console.debug("🎬 [getVideoUrlFromClip] videoStreamUrl 템플릿 사용", { template: t, no, url });
    return url;
  }

  const url = toPath(c?.videoUrl || c?.videoDir || c?.path || "");
  // console.debug("🎬 [getVideoUrlFromClip] 보조 필드 사용", { url });
  return url;
}

/** clip → 포스터(썸네일) URL (로깅 포함) */
function getPosterFromClip(c) {
  const raw =
    c?.thumbnailDir ??
    c?.thumbnailUrl ??
    c?.poster ??
    "";

  const url = toPath(raw) || "";
  console.debug("🖼️ [getPosterFromClip]", {
    raw_thumbnailDir: c?.thumbnailDir,
    raw_thumbnailUrl: c?.thumbnailUrl,
    raw_poster: c?.poster,
    decided: url || "(empty)",
    note: url ? "toPath 결과 사용" : "toPath로 필터되어 빈 문자열일 수 있음(로컬/파일 스킴 차단)"
  });
  return url;
}

export default function SessionPreview() {
  const { sessionId } = useParams();
  const nav = useNavigate();
  const [clips, setClips] = useState([]); // [{..., posterUrl, videoUrl}]
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let abort = false;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        // console.log("🔹 [SessionPreview] 요청:", `/user/profile/${sessionId}`);
        const { data } = await api.get(`/user/profile/${sessionId}`);
        // console.log("📦 [원본 data]:", data);

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.clips)
            ? data.clips
            : [];

        // console.log("📋 [clips 원본]:", list);

        // poster/videoUrl 가공 + 로깅
        const normalized = (list ?? []).map((c) => {
          const posterUrl = getPosterFromClip(c);
          const videoUrl = getVideoUrlFromClip(c);
          return { ...c, posterUrl, videoUrl };
        });

        // 요약 테이블 출력 (id, videoNo, posterUrl, videoUrl)
        try {
          const table = normalized.map((c) => ({
            id: c.id ?? c.clipId ?? c.videoNo ?? c.questionNo,
            videoNo: c.videoNo,
            posterUrl: c.posterUrl,
            videoUrl: c.videoUrl,
          }));
          console.table(table);
        } catch { /* 콘솔 테이블 실패 무시 */ }

        if (!abort) setClips(normalized);
      } catch (e) {
        console.error("❌ [에러]:", e);
        if (!abort) setErr("질문/영상 목록을 불러오지 못했습니다.");
      } finally {
        if (!abort) setLoading(false);
        // console.log("🏁 [요청 종료]");
      }
    })();

    return () => {
      abort = true;
    };
  }, [sessionId]);

  // ✅ 썸네일 가용성 핑: 실제로 로드되는지 이미지로 확인 (초기 로드 후 1회)
  useEffect(() => {
    if (!clips?.length) return;
    // 너무 많을 수 있으니 상위 12개만 핑
    const targets = clips.slice(0, 12);
    targets.forEach((c) => {
      if (!c.posterUrl) {
        console.warn("🟨 [핑 생략] posterUrl 비어있음", { videoNo: c.videoNo, clip: c });
        return;
      }
      const img = new Image();
      img.onload = () => console.log("✅ [썸네일 로드 OK]", c.posterUrl);
      img.onerror = () => console.warn("❌ [썸네일 로드 FAIL]", c.posterUrl);
      img.src = c.posterUrl;
    });
  }, [clips]);

  // ✅ 카드 클릭 → 상세로 poster/videoUrl 함께 전달
  const goDetail = (clip) => {
    if (!clip?.videoNo) return;
    const stateClip = {
      ...clip,
      poster: clip.posterUrl || getPosterFromClip(clip) || undefined,
      videoUrl: clip.videoUrl || getVideoUrlFromClip(clip) || undefined,
    };
    console.log("➡️ [goDetail] 이동 상태값:", stateClip);

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
          <div className="text-sm text-gray-500">세션 #{sessionId}</div>
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
            <section className="w-full md:col-span-2 col-span-full rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
                <h3 className="text-sm font-semibold text-gray-900">총평</h3>
              </div>

              <div className="text-[15px] text-gray-700 leading-7 tracking-tight">
                <p>이전에는 영상과 음성의 전달이 다소 불안정해 메시지가 명확하게 전달되지 않았습니다.</p>
                그러나 현재 결과에서는 발화 속도와 표현의 일관성이 개선되어 전달력이 한층 높아졌습니다.
                앞으로는 이러한 안정감을 바탕으로 감정 표현의 자연스러움을 보완해 나가면 좋겠습니다.
              </div>

              <div className="flex items-center gap-2 mb-3 mt-8">
                <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
                <h3 className="text-sm font-semibold text-gray-900">이전 인터뷰와 비교</h3>
              </div>


              <div className="text-[15px] text-gray-700 leading-7 tracking-tight">
                <p>이전에는 영상과 음성의 전달이 다소 불안정해 메시지가 명확하게 전달되지 않았습니다.</p>
                그러나 현재 결과에서는 발화 속도와 표현의 일관성이 개선되어 전달력이 한층 높아졌습니다.
                앞으로는 이러한 안정감을 바탕으로 감정 표현의 자연스러움을 보완해 나가면 좋겠습니다.
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
              <div className="py-16 text-center text-sm text-gray-500">
                표시할 항목이 없습니다.
              </div>
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
                    <div className="h-42 bg-blue-50">
                      {c.posterUrl ? (
                        <img
                          src={c.posterUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                          onError={() =>
                            console.warn("⚠️ [이미지 onError] posterUrl:", c.posterUrl)
                          }
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-lg overflow-hidden">
                          <img
                            src={
                              c.posterUrl ||
                              `http://172.31.57.139:8080/thumbnail?path=${encodeURIComponent(
                                c.thumbnailDir ?? ""
                              )}`
                            }
                            alt="thumbnail"
                            className="max-w-full max-h-full object-contain"
                            onError={() =>
                              console.warn("⚠️ 썸네일 로드 실패:", c.thumbnailDir)
                            }
                          />
                        </div>

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
