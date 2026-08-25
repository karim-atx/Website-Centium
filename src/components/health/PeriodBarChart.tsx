import React, { useState } from "react";

// Simple hand-rolled bar chart (no charting library in this project) used
// by the Steps and Weight detail views for their daily/weekly/monthly/
// yearly breakdowns — Apple Health-inspired, not copied.
// V7 (QA 7.0): hovering (or tapping, for touch) a bar shows its exact value
// for that specific week/month/year instead of only the chart-wide average.
export const PeriodBarChart: React.FC<{
  values: number[];
  labels: string[];
  color?: string;
  height?: number;
}> = ({ values, labels, color = "#4C8FD1", height = 90 }) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {values.map((v, i) => (
        <div
          key={i}
          className="relative flex-1 flex flex-col items-center gap-1 h-full justify-end"
          onMouseEnter={() => setActiveIdx(i)}
          onMouseLeave={() => setActiveIdx(null)}
          onTouchStart={() => setActiveIdx(i)}
        >
          {activeIdx === i && (
            <span className="absolute -top-5 text-[10px] font-bold text-charcoal bg-cream-card rounded-full px-2 py-0.5 shadow-soft whitespace-nowrap z-10">
              {v.toLocaleString()}
            </span>
          )}
          <div
            className="w-full rounded-t-md transition-all duration-500"
            style={{
              height: `${Math.max((v / max) * 100, 4)}%`,
              background: color,
              opacity: activeIdx === null || activeIdx === i ? 0.85 : 0.4,
            }}
          />
          <span className="text-[9px] text-charcoal-faint whitespace-nowrap">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
};
