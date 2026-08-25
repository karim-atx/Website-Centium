import React from "react";

// V8 (QA 8.0): "shows you a graph of the history of that selected biomarker
// with the X axis representing the date and the Y axis representing the
// unit" — a proper line graph, replacing the old horizontal-bar-per-reading
// layout (which had value on X and date on Y, the QA's exact complaint).
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const BiomarkerLineChart: React.FC<{
  history: { date: string; value: number }[];
  unit: string;
  color: string;
  width?: number;
  height?: number;
}> = ({ history, unit, color, width = 280, height = 140 }) => {
  if (history.length < 2) return null;

  const padding = { top: 12, right: 10, bottom: 22, left: 38 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const values = history.map((h) => h.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const x = (i: number) => padding.left + (i / (history.length - 1)) * plotW;
  const y = (v: number) => padding.top + plotH - ((v - min) / range) * plotH;

  const path = history.map((h, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(h.value)}`).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {[min, (min + max) / 2, max].map((v, i) => (
        <g key={i}>
          <text x={0} y={y(v) + 3} fontSize={9} fill="#9C9284">
            {v.toFixed(1)}{unit}
          </text>
          <line x1={padding.left} x2={width - padding.right} y1={y(v)} y2={y(v)} stroke="#EDEDEF" strokeWidth={1} />
        </g>
      ))}

      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {history.map((h, i) => (
        <circle key={h.date} cx={x(i)} cy={y(h.value)} r={2.5} fill={color} />
      ))}

      <text x={x(0)} y={height - 4} fontSize={9} fill="#9C9284" textAnchor="start">
        {shortDate(history[0].date)}
      </text>
      <text x={x(history.length - 1)} y={height - 4} fontSize={9} fill="#9C9284" textAnchor="end">
        {shortDate(history[history.length - 1].date)}
      </text>
    </svg>
  );
};
