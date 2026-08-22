import React from "react";

// Simple hand-rolled bar chart (no charting library in this project) used
// by the Steps and Weight detail views for their daily/weekly/monthly/
// yearly breakdowns — Apple Health-inspired, not copied.
export const PeriodBarChart: React.FC<{
  values: number[];
  labels: string[];
  color?: string;
  height?: number;
}> = ({ values, labels, color = "#4C8FD1", height = 90 }) => {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
          <div
            className="w-full rounded-t-md transition-all duration-500"
            style={{ height: `${Math.max((v / max) * 100, 4)}%`, background: color, opacity: 0.85 }}
          />
          <span className="text-[9px] text-charcoal-faint whitespace-nowrap">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
};
