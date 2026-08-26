import React from "react";

// V4 (QA 4.0): the nutrition ring's progress arc is split into
// protein/carbs/fat segments, colored to match the Food page's macro bars
// (protein green, carbs gold, fat teal), instead of one flat color.
const PROTEIN_COLOR = "#7D6BB5";
const CARBS_COLOR = "#D9A441";
const FAT_COLOR = "#6F9993";

interface MacroRingProps {
  size?: number;
  strokeWidth?: number;
  protein: number; // grams logged today
  carbs: number;
  fat: number;
  progress: number; // 0-1 overall calorie progress — total arc length filled
  trackColor?: string;
  children?: React.ReactNode;
}

export const MacroRing: React.FC<MacroRingProps> = ({
  size = 92,
  strokeWidth = 9,
  protein,
  carbs,
  fat,
  progress,
  trackColor = "#EDEDEF",
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filledLength = circumference * Math.max(0, Math.min(1, progress));

  const proteinCal = Math.max(0, protein) * 4;
  const carbsCal = Math.max(0, carbs) * 4;
  const fatCal = Math.max(0, fat) * 9;
  const totalMacroCal = proteinCal + carbsCal + fatCal;

  const segments =
    totalMacroCal > 0
      ? [
          { color: PROTEIN_COLOR, length: (proteinCal / totalMacroCal) * filledLength },
          { color: CARBS_COLOR, length: (carbsCal / totalMacroCal) * filledLength },
          { color: FAT_COLOR, length: (fatCal / totalMacroCal) * filledLength },
        ]
      : [{ color: PROTEIN_COLOR, length: filledLength }];

  let cursor = 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        {segments.map((seg, i) => {
          if (seg.length <= 0.5) return null;
          const dashoffset = -cursor;
          cursor += seg.length;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={seg.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${seg.length} ${circumference - seg.length}`}
              strokeDashoffset={dashoffset}
              style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1)" }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};
