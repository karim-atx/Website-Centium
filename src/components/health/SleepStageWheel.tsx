import React from "react";
import type { SleepStages } from "./StackedSleepBar";

const stageColor = { awake: "#6F9993", rem: "#9C4F7C", light: "#4C8FD1", deep: "#7D6BB5" };

// V6 (QA 6.0): the expanded Home sleep widget shows stages as a wheel
// (donut), alongside the existing "vs weekly avg" line — same segment
// technique/colors as StackedSleepBar, just drawn as a ring.
export const SleepStageWheel: React.FC<{ stages: SleepStages; size?: number; strokeWidth?: number }> = ({
  stages,
  size = 64,
  strokeWidth = 8,
}) => {
  const total = stages.remMin + stages.deepMin + stages.lightMin + stages.awakeMin || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const segments: { key: keyof typeof stageColor; min: number }[] = [
    { key: "awake", min: stages.awakeMin },
    { key: "rem", min: stages.remMin },
    { key: "light", min: stages.lightMin },
    { key: "deep", min: stages.deepMin },
  ];

  let cursor = 0;

  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="#EDEDEF" strokeWidth={strokeWidth} fill="none" />
      {segments.map((s) => {
        const length = (s.min / total) * circumference;
        if (length <= 0.5) return null;
        const dashoffset = -cursor;
        cursor += length;
        return (
          <circle
            key={s.key}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={stageColor[s.key]}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={dashoffset}
          />
        );
      })}
    </svg>
  );
};
