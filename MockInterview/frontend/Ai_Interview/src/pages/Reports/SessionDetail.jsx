// src/pages/Reports/SessionDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../utils/axiosInstance";

export default function SessionDetail() {
  const { sessionId, videoNo } = useParams();   // ← URL에서 :sessionId, :videoNo 받음
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        // ✅ 백엔드 엔드포인트: /videos/stream/{videoNo}
        const res = await api.get(`/videos/stream/${videoNo}`);
        setData(res.data);
      } catch (e) {
        setErr("데이터를 불러오는 데 실패했습니다.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [videoNo]);

  if (loading) return <div className="p-6 text-gray-500">불러오는 중…</div>;
  if (err) return <div className="p-6 text-red-500">{err}</div>;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h2 className="text-lg font-semibold mb-4">
        세션 {sessionId} · 비디오 {videoNo}
      </h2>

      {/* JSON을 그대로 문자열로 보여주기 */}
      <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
