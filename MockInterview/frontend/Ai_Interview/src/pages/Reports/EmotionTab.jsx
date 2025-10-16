
import ChartDraggable from "../../components/ChartDraggable copy";
import EmotionHeatSlider from "../../components/EmotionHeatSlider";

export default function EmotionTab({ emotionChartData, cursorTime, onChangeTime }) {
  return (
    <>
      <p className="text-xs text-gray-500 mb-2">프레임별 감정 확률(%)</p>
      <div className="rounded-xl border border-gray-200 bg-white p-3 min-w-0">
        {emotionChartData?.length ? (
          <ChartDraggable
            data={emotionChartData}
            duration={emotionChartData.at(-1)?.t || 0}
            cursorTime={cursorTime}
            onChangeTime={onChangeTime}
            series={["neutral", "happy", "sad", "angry", "fear", "disgust", "surprise"]}
            yDomain={[0, 100]}
          />
        ) : (
          <div className="text-xs text-gray-500">표시할 감정 데이터가 없습니다.</div>
        )}
      </div>
      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
        <EmotionHeatSlider data={emotionChartData} cursorTime={cursorTime} onChangeTime={onChangeTime} bins={7} />
      </div>
    </>
  );
}
