// src/pages/Debug/ProfileClipsPage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../utils/axiosInstance";

export default function ProfileClipsPage() {
  const { interviewNo } = useParams();              // URL의 {interviewNo}
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        // baseURL이 "/api"면 → 결과적으로 GET /api/user/profile/:interviewNo
        const { data } = await api.get(`/user/profile/${interviewNo}`, {
          headers: { "Content-Type": "application/json" }, // 백엔드 요구사항
        });
        if (!abort) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!abort) setErr("데이터를 불러오지 못했습니다.");
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [interviewNo]);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <section className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold">DB 값 읽기 테스트</h2>
          <p className="text-sm text-gray-600 mt-1">
            엔드포인트: <code>/api/user/profile/{interviewNo}</code>
          </p>
        </section>

        <section className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-500">불러오는 중…</div>
          ) : err ? (
            <div className="py-16 text-center text-sm text-red-500">{err}</div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">
              데이터가 없습니다. (interviewNo: {interviewNo})
            </div>
          ) : (
            <>
              {/* 1) 표로 보기 */}
              <div className="rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <Th className="w-24 text-center">videoNo</Th>
                      <Th className="w-28 text-center">questionNo</Th>
                      <Th>content</Th>
                      <Th>thumbnailDir</Th>
                      <Th>videoDir</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.videoNo} className="border-t">
                        <Td className="text-center">{r.videoNo}</Td>
                        <Td className="text-center">{r.questionNo}</Td>
                        <Td>{r.content}</Td>
                        <Td className="font-mono text-[12px]">{r.thumbnailDir}</Td>
                        <Td className="font-mono text-[12px]">{r.videoDir}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 2) 원본 JSON 보기(디버그) */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-600">
                  원본 JSON 보기
                </summary>
                <pre className="mt-2 text-xs bg-gray-50 p-3 rounded-lg overflow-auto">
                  {JSON.stringify(rows, null, 2)}
                </pre>
              </details>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Th({ children, className = "" }) {
  return <th className={`py-3 px-3 text-left font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`py-3 px-3 align-middle ${className}`}>{children}</td>;
}
