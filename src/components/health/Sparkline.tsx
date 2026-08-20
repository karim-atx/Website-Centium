import React from "react";

export const Sparkline: React.FC<{
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}> = ({ values, color = "#1B6B52", width = 100, height = 32 }) => {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  const path = `M${points.join(" L")}`;
  const areaPath = `${path} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <path d={areaPath} fill={color} opacity={0.08} />
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={(values.length - 1) * step}
        cy={height - ((values[values.length - 1] - min) / range) * height}
        r={3}
        fill={color}
      />
    </svg>
  );
};
