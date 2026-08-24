import React from "react";
import { Flame } from "lucide-react";

// Apple Fitness-style "ring closing" visual, but as a minimalistic flame
// whose outline fills gradually (dark orange -> yellow) as calories burned
// climbs toward the goal — inspired, not copied.
export const CaloriesRing: React.FC<{ progress: number; size?: number }> = ({ progress, size = 120 }) => {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);
  const gradientId = "calories-ring-gradient";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6F9993" />
            <stop offset="100%" stopColor="#D9A441" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#F4EDE4" strokeWidth={9} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={9}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <Flame size={size * 0.32} className="absolute text-ember" fill="currentColor" fillOpacity={0.15} />
    </div>
  );
};
