// import { useMutation } from "@tanstack/react-query";
// import { useRef, useEffect } from "react";

// /* ====== 유틸 ====== */
// const mimeToExt = (mime = "video/webm") => {
//   const m = (mime || "").toLowerCase();
//   if (m.includes("webm")) return "webm";
//   if (m.includes("mp4")) return "mp4";
//   return "webm";
// };
// const joinUrl = (base, path) =>
//   `${base.replace(/\/+$/, "")}/${String(path || "").replace(/^\/+/, "")}`;

// const API_BASE = import.meta.env.VITE_API_BASE || "";

// /* ====== 업로드 함수 (fetch + Abort 지원) ====== */
// async function uploadCalibrationFn({ interviewNo, blob, mimeType = "video/webm", signal }) {
//   if (!interviewNo) throw new Error("interviewNo가 없습니다.");

//   const ext = mimeToExt(mimeType);
//   const filename = `calibration_${Date.now()}.${ext}`;
//   const form = new FormData();
//   form.append("video", blob, filename); // 서버 필드명: 'video'

//   const url = joinUrl(API_BASE, `/api/interviews/${interviewNo}/calibration`);

//   const res = await fetch(url, {
//     method: "POST",
//     body: form,
//     signal,
//     // credentials: "include", // 쿠키 기반 인증이면 주석 해제
//   });

//   if (!res.ok) {
//     const text = await res.text().catch(() => "");
//     throw new Error(`업로드 실패 (HTTP ${res.status}): ${text}`);
//   }
//   const data = await res.json().catch(() => ({}));
//   if (data?.message !== true) throw new Error(data?.error || "서버에서 실패 응답을 반환했습니다.");
//   return data;
// }

// /**
//  * React Query 커스텀 훅 (진행률 X, 취소만 지원)
//  * - onSuccess/onError/onSettled 옵션 외부 주입 가능
//  */
// export function useCalibrationUpload(mutationOptions = {}) {
//   const abortRef = useRef(null);

//   // 언마운트 시 남아있는 업로드 취소
//   useEffect(() => {
//     return () => {
//       if (abortRef.current) abortRef.current.abort();
//     };
//   }, []);

//   const mutation = useMutation({
//     mutationFn: async ({ interviewNo, blob, mimeType }) => {
//       if (abortRef.current) abortRef.current.abort(); // 이전 요청 취소
//       abortRef.current = new AbortController();
//       return uploadCalibrationFn({
//         interviewNo,
//         blob,
//         mimeType,
//         signal: abortRef.current.signal,
//       });
//     },
//     retry: 1,
//     ...mutationOptions,
//   });

//   const cancel = () => {
//     if (abortRef.current) abortRef.current.abort();
//   };

//   return { ...mutation, cancel };
// }
