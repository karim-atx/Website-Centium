import React, { useId } from "react";

// Iteration 6.2 widget library, Meditation widget: a 5-petal lotus whose
// outline stays visible at every fill level — colour rises inside each
// petal along ONE shared waterline (a single gradient stop offset shared
// by every petal's fill), not per-petal, so the flower fills as a unit.
// `progress` omitted (small widget) renders the outline only, un-filled.
const PETALS = [
  "M12 3 C15.2 6.6 16.2 10 16 12.6 C15.8 15 14.3 17.2 12 18.6 C9.7 17.2 8.2 15 8 12.6 C7.8 10 8.8 6.6 12 3 Z",
  "M4.2 7.4 C8.4 7.9 11.2 10.6 12.4 14 C13 15.6 13 17.4 12.6 18.8 C8.6 18.2 5.6 15.4 4.4 11.8 C3.9 10.2 3.9 8.7 4.2 7.4 Z",
  "M19.8 7.4 C15.6 7.9 12.8 10.6 11.6 14 C11 15.6 11 17.4 11.4 18.8 C15.4 18.2 18.4 15.4 19.6 11.8 C20.1 10.2 20.1 8.7 19.8 7.4 Z",
  "M1.4 16.1 C4.4 13.5 8.2 12.9 11.2 14.7 C12 15.2 12.6 15.8 13 16.4 C10 19 6.2 19.6 3.2 17.8 C2.4 17.3 1.8 16.7 1.4 16.1 Z",
  "M22.6 16.1 C19.6 13.5 15.8 12.9 12.8 14.7 C12 15.2 11.4 15.8 11 16.4 C14 19 17.8 19.6 20.8 17.8 C21.6 17.3 22.2 16.7 22.6 16.1 Z",
];

export const LotusGlyph: React.FC<{ size: number; progress?: number; stroke?: string }> = ({
  size,
  progress,
  stroke = "rgb(var(--c-team-teal-ink))",
}) => {
  const gid = useId();
  // The gradient line runs bottom (y1, offset 0%) to top (y2, offset 100%),
  // so the offset IS the fill fraction — a hard stop at that offset, not a
  // soft blend, is what gives every petal one shared, crisp waterline.
  const fillPct = Math.max(0, Math.min(1, progress ?? 0)) * 100;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: "block", flex: "none" }}>
      {progress !== undefined && (
        <defs>
          <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" y1="19.6" x2="0" y2="2.4">
            <stop offset={`${fillPct}%`} stopColor={stroke} stopOpacity={0.4} />
            <stop offset={`${fillPct}%`} stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {PETALS.map((d, i) => (
        <path
          key={i}
          d={d}
          fill={progress !== undefined ? `url(#${gid})` : "none"}
          stroke={stroke}
          strokeWidth={1.3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
};
