import { useEffect, type FC, useCallback } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import ReactTooltip from 'react-tooltip';
import 'react-calendar-heatmap/dist/styles.css';
import './heat.css';

interface HeatMapData {
  date: string;
  value: number;
}

interface HeatMapProps {
  pdfData: HeatMapData[];
  year: number;
}

interface HeatmapValue {
  date: Date;
  count: number;
}

const getColorClass = (value: HeatmapValue | null): string => {
  if (!value) return 'color-empty';
  if (value.count < 5) return `color-github-${value.count}`;
  return value.count < 10 ? 'color-github-4' : 'color-github-5';
};

const HeatMap: FC<HeatMapProps> = ({ pdfData, year }) => {
  useEffect(() => {
    ReactTooltip.rebuild();
  }, [pdfData]);

  if (!pdfData || pdfData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-blue-700">
        <span className="text-lg">No heatmap data available.</span>
      </div>
    );
  }

  const heatmapData: HeatmapValue[] = pdfData.map(({ date, value }) => ({
    date: new Date(date),
    count: value,
  }));

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  const getTooltipData = useCallback((value: HeatmapValue | null) => {
    if (!value?.date) return null;

    return {
      'data-tip': `${value.date.toDateString()}: ${value.count} PDFs processed`,
    };
  }, []);

  return (
    <div>
      <CalendarHeatmap
        startDate={startDate}
        endDate={endDate}
        values={heatmapData}
        classForValue={getColorClass}
        showWeekdayLabels={false}
        tooltipDataAttrs={getTooltipData}
      />
      <ReactTooltip effect="solid" />
    </div>
  );
};

export default HeatMap;
