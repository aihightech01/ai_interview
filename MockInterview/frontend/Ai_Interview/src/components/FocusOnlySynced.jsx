// src/components/FocusOnlySynced.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
    Brush,
} from "recharts";

function fmt(sec = 0) {
    const m = Math.floor(sec);
    const s = (sec - m).toFixed(1);
    const mm = Math.floor(m / 60);
    const ss = (m % 60) + s.slice(1);
    return `${String(mm).padStart(2, "0")}:${ss.padStart(4, "0")}`;
}

/**
 * props:
 *  - visionChartData: [{ frame, tSec, headYaw, headPitch, gazeYaw, gazePitch }, ...]
 *    * tSec(초) 필수 (toVisionChartData에서 생성)
 *  - videoUrl?: string
 *  - poster?: string
 */
export default function FocusOnlySynced({ visionChartData = [], videoUrl = "", poster = "" }) {
    const [cursorTime, setCursorTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);

    const videoRef = useRef(null);
    const chartWrapRef = useRef(null);   // 클릭 좌표 → 시간 변환용
    const cursorRef = useRef(0);
    cursorRef.current = cursorTime;

    // 전체 구간 길이: 영상 duration 우선, 없으면 데이터 마지막 tSec
    const totalSec = useMemo(() => {
        const t = visionChartData.at(-1)?.tSec || 0;
        return (duration && Number.isFinite(duration) ? duration : 0) || t || 0;
    }, [duration, visionChartData]);

    // rAF: 재생 중에는 video.currentTime → cursorTime
    useEffect(() => {
        let raf = 0;
        const v = videoRef.current;
        if (!v) return;

        const tick = () => {
            if (!v.paused && !v.ended) {
                const t = v.currentTime || 0;
                if (Math.abs(t - cursorRef.current) > 1 / 30) setCursorTime(t);
                raf = requestAnimationFrame(tick);
            }
        };

        if (isPlaying) raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [isPlaying]);

    // 외부 조작(차트 클릭) → 비디오도 이동
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        if (Math.abs((v.currentTime || 0) - cursorTime) > 0.03) {
            v.currentTime = cursorTime;
        }
    }, [cursorTime]);

    const onLoadedMetadata = () => {
        const v = videoRef.current;
        if (!v) return;
        setDuration(v.duration || 0);
    };

    // === 차트 클릭 → 시간으로 변환 ===
    // Recharts onClick 핸들러는 e.activeLabel(=X값)을 주는 경우가 많아 그걸 우선 사용.
    // 혹시 없으면 픽셀→시간으로 직접 변환 (컨테이너 rect와 margin 기준)
    const MARGIN = { top: 10, right: 20, bottom: 10, left: 40 };
    const xDomain = useMemo(() => {
        const maxX = totalSec || visionChartData.at(-1)?.tSec || 0;
        return [0, Math.max(0, Number(maxX) || 0)];
    }, [totalSec, visionChartData]);

    const handleChartClick = (e) => {
        // 1) Recharts에서 제공: e.activeLabel가 있으면 그걸 사용
        if (e && typeof e.activeLabel === "number") {
            setCursorTime(Math.max(xDomain[0], Math.min(xDomain[1], e.activeLabel)));
            return;
        }
        // 2) fallback: clientX → 초 단위로 직접 변환
        const el = chartWrapRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const plotLeft = rect.left + MARGIN.left;
        const plotRight = rect.right - MARGIN.right;
        const w = Math.max(0, plotRight - plotLeft);
        if (w === 0) return;

        const clientX = (e && e.changedTouches ? e.changedTouches[0].clientX : e?.clientX) ?? null;
        if (clientX == null) return;

        const pct = (clientX - plotLeft) / w; // 0~1
        const clamped = Math.min(1, Math.max(0, pct));
        const t = xDomain[0] + (xDomain[1] - xDomain[0]) * clamped;
        setCursorTime(t);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* 좌: 영상 */}
            <div>
                <p className="text-xs text-gray-500 mb-2">실전 면접 영상</p>
                <div className="aspect-video overflow-hidden rounded-xl bg-black/90 text-white flex items-center justify-center">
                    {videoUrl ? (
                        <video
                            ref={videoRef}
                            className="w-full h-full"
                            controls
                            preload="metadata"
                            src={videoUrl}
                            poster={poster || undefined}
                            onLoadedMetadata={onLoadedMetadata}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onEnded={() => setIsPlaying(false)}
                        />
                    ) : (
                        <span className="opacity-60 text-sm">영상 소스가 없습니다.</span>
                    )}
                </div>
                <div className="mt-2 text-[11px] text-gray-500">
                    {fmt(cursorTime)} / {fmt(totalSec)}
                </div>
            </div>

            {/* 우: 집중도 라인차트 (X축=tSec) */}
            <div className="min-w-0 self-center">
                <div
                    className="aspect-video rounded-xl border border-gray-200 bg-white p-3 flex flex-col"
                    ref={chartWrapRef}
                >
                    <p className="text-xs text-gray-600 mb-2 text-center">시선/머리 각도 변화 (°)</p>

                    {visionChartData.length ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={visionChartData}
                                margin={MARGIN}
                                onClick={handleChartClick}            // ← 클릭으로 이동
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="tSec"                        // ← 초 단위
                                    tick={{ fontSize: 11 }}
                                    domain={xDomain}
                                    type="number"
                                    tickFormatter={(t) => fmt(Number(t))}
                                />

                                <YAxis
                                    domain={["auto", "auto"]}
                                    tick={false}
                                    axisLine={false}
                                    tickLine={false}
                                    width={0}
                                />

                                <Tooltip
                                    formatter={(v, name) => [`${Number(v).toFixed(2)}°`, name]}
                                    labelFormatter={(t) => `t=${fmt(Number(t))}`}
                                />
                                <Legend />
                                <ReferenceLine y={0} stroke="#999" strokeDasharray="4 3" />

                                {/* ★ 현재 커서 수직선 */}
                                <ReferenceLine
                                    x={cursorTime}
                                    stroke="#2563eb"
                                    strokeWidth={2}
                                    ifOverflow="extendDomain"
                                />

                                <Line type="monotone" dataKey="headYaw" name="Head Yaw" dot={false} stroke="#2563eb" strokeWidth={2} />
                                <Line type="monotone" dataKey="gazeYaw" name="Gaze Yaw" dot={false} stroke="#16a34a" strokeWidth={2} />
                                <Line type="monotone" dataKey="headPitch" name="Head Pitch" dot={false} stroke="#7c3aed" strokeWidth={1.5} />
                                <Line type="monotone" dataKey="gazePitch" name="Gaze Pitch" dot={false} stroke="#ea580c" strokeWidth={1.5} />


                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-xs text-gray-500">표시할 비전 데이터가 없습니다.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
