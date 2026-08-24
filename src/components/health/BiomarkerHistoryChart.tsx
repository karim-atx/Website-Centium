import React from "react";

// V5 (QA 5.0): blood marker history as a horizontal chart per QA — the
// X axis is the value, the Y axis is the date (one row per reading),
// sized to stay readable inside a small card widget.
export const BiomarkerHistoryChart: React.FC<{
  history: { date: string; value: number }[];
  unit: string;
  color: string;
  width?: number;
}> = ({ history, unit, color, width = 220 }) => {
  const values = history.map((h) => h.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values);
  const range = max - min || 1;

  const rowH = 20;
  const labelW = 44;
  const barAreaW = width - labelW;
  const height = history.length * rowH;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {history.map((h, i) => {
        const barW = Math.max(2, ((h.value - min) / range) * (barAreaW - 34));
        const y = i * rowH;
        return (
          <g key={h.date}>
            <text x={0} y={y + rowH / 2 + 3} fontSize={9} fill="#9C9284">
              {h.date}
            </text>
            <rect x={labelW} y={y + 4} width={barAreaW - 34} height={rowH - 10} rx={4} fill="#EDEDEF" />
            <rect x={labelW} y={y + 4} width={barW} height={rowH - 10} rx={4} fill={color} />
            <text x={labelW + barAreaW - 30} y={y + rowH / 2 + 3} fontSize={9} fontWeight={700} fill="#241F1B">
              {h.value}
              {unit}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
