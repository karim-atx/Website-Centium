import React from "react";

// V4 (QA 4.0): a labeled line graph — y-axis in kg, x-axis by date — that
// plots the actual recent weight history (solid) continuing as a projected
// trajectory to the goal weight (dashed), rather than a bare unlabeled
// sparkline. The "reach by" estimate is shown separately, below this.
interface Point {
  date: string; // yyyy-mm-dd
  value: number;
  projected?: boolean;
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const WeightTrendChart: React.FC<{
  history: { date: string; value: number }[];
  desiredWeightKg?: number;
  reachDate?: string | null;
  width?: number;
  height?: number;
}> = ({ history, desiredWeightKg, reachDate, width = 280, height = 120 }) => {
  const points: Point[] = history.map((h) => ({ ...h, projected: false }));
  if (desiredWeightKg !== undefined && reachDate) {
    points.push({ date: reachDate, value: desiredWeightKg, projected: true });
  }
  if (points.length < 2) return null;

  const padding = { top: 10, right: 8, bottom: 20, left: 34 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const x = (i: number) => padding.left + (i / (points.length - 1)) * plotW;
  const y = (v: number) => padding.top + plotH - ((v - min) / range) * plotH;

  const actualPoints = points.filter((p) => !p.projected);
  const splitIndex = actualPoints.length - 1;

  const pathFor = (from: number, to: number) =>
    points
      .slice(from, to + 1)
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(from + i)},${y(p.value)}`)
      .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {/* y-axis ticks */}
      {[min, (min + max) / 2, max].map((v, i) => (
        <g key={i}>
          <text x={0} y={y(v) + 3} fontSize={9} fill="#9C9284">
            {v.toFixed(0)}kg
          </text>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={y(v)}
            y2={y(v)}
            stroke="#EDEDEF"
            strokeWidth={1}
          />
        </g>
      ))}

      {/* actual history — solid */}
      <path d={pathFor(0, splitIndex)} fill="none" stroke="#7D6BB5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* projected trajectory to goal — dashed */}
      {points.length > actualPoints.length && (
        <path
          d={pathFor(splitIndex, points.length - 1)}
          fill="none"
          stroke="#7D6BB5"
          strokeWidth={2}
          strokeDasharray="4 4"
          strokeLinecap="round"
        />
      )}

      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.value)}
          r={i === 0 || i === points.length - 1 ? 3.5 : 0}
          fill={p.projected ? "#fff" : "#7D6BB5"}
          stroke="#7D6BB5"
          strokeWidth={p.projected ? 2 : 0}
        />
      ))}

      {/* x-axis: first, today/last-actual, and goal date */}
      <text x={x(0)} y={height - 4} fontSize={9} fill="#9C9284" textAnchor="start">
        {shortDate(points[0].date)}
      </text>
      <text x={x(points.length - 1)} y={height - 4} fontSize={9} fill="#9C9284" textAnchor="end">
        {shortDate(points[points.length - 1].date)}
      </text>
    </svg>
  );
};
