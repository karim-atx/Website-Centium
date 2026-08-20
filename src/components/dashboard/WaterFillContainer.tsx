import React from "react";

/** Visual "filling bottle" — animates its height whenever the fill % changes. */
export const WaterFillContainer: React.FC<{ pct: number; height?: number; width?: number }> = ({
  pct,
  height = 64,
  width = 40,
}) => {
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <div
      className="relative rounded-2xl border-2 border-sky/30 bg-sky-pale overflow-hidden shrink-0"
      style={{ width, height }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-sky to-sky/70 transition-[height] duration-700 ease-out"
        style={{ height: `${clamped * 100}%` }}
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/30" />
      </div>
    </div>
  );
};
