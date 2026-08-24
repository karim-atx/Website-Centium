import React from "react";
import clsx from "clsx";

interface ProgressBarProps {
  progress: number; // 0-1
  color?: string;
  trackClassName?: string;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = "#7D6BB5",
  trackClassName,
  height = 8,
}) => {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <div
      className={clsx("w-full rounded-full bg-cream-soft overflow-hidden", trackClassName)}
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${clamped * 100}%`, background: color }}
      />
    </div>
  );
};
