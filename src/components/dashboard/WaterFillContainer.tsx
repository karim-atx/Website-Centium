import React from "react";

// V4: small widget = vertical bar (fills bottom-up), large widget = horizontal
// bar (fills left-to-right) — per QA.
export const WaterFillContainer: React.FC<{
  pct: number;
  height?: number;
  width?: number | string;
  orientation?: "vertical" | "horizontal";
}> = ({ pct, height = 64, width = 40, orientation = "vertical" }) => {
  const clamped = Math.max(0, Math.min(1, pct));

  if (orientation === "horizontal") {
    return (
      <div
        className="relative rounded-2xl border-2 border-sky/30 bg-sky-pale overflow-hidden shrink-0"
        style={{ width, height }}
      >
        <div
          className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-sky/70 to-sky transition-[width] duration-700 ease-out"
          style={{ width: `${clamped * 100}%` }}
        >
          <div className="absolute top-0 bottom-0 right-0 w-1.5 bg-white/30" />
        </div>
      </div>
    );
  }

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
