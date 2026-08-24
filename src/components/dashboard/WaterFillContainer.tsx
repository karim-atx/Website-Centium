import React from "react";

// V4: small widget = vertical bar (fills bottom-up), large widget = horizontal
// bar (fills left-to-right) — per QA.
// V6 (QA 6.0): a special animation plays once the goal is exceeded — a gold
// pulsing ring (reusing the existing pulse-ring keyframe from AIVoiceLogger)
// plus a gold border, instead of just silently capping the fill at 100%.
export const WaterFillContainer: React.FC<{
  pct: number;
  height?: number;
  width?: number | string;
  orientation?: "vertical" | "horizontal";
}> = ({ pct, height = 64, width = 40, orientation = "vertical" }) => {
  const exceeded = pct > 1;
  const clamped = Math.max(0, Math.min(1, pct));

  if (orientation === "horizontal") {
    return (
      <div
        className={`relative rounded-2xl border-2 overflow-hidden shrink-0 ${
          exceeded ? "border-gold bg-gold-pale" : "border-sky/30 bg-sky-pale"
        }`}
        style={{ width, height }}
      >
        {exceeded && (
          <span className="absolute inset-0 rounded-2xl border-2 border-gold animate-pulse-ring pointer-events-none" />
        )}
        <div
          className={`absolute top-0 bottom-0 left-0 transition-[width] duration-700 ease-out bg-gradient-to-r ${
            exceeded ? "from-gold/70 to-gold" : "from-sky/70 to-sky"
          }`}
          style={{ width: `${clamped * 100}%` }}
        >
          <div className="absolute top-0 bottom-0 right-0 w-1.5 bg-white/30" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-2xl border-2 overflow-hidden shrink-0 ${
        exceeded ? "border-gold bg-gold-pale" : "border-sky/30 bg-sky-pale"
      }`}
      style={{ width, height }}
    >
      {exceeded && (
        <span className="absolute inset-0 rounded-2xl border-2 border-gold animate-pulse-ring pointer-events-none" />
      )}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-[height] duration-700 ease-out bg-gradient-to-t ${
          exceeded ? "from-gold to-gold/70" : "from-sky to-sky/70"
        }`}
        style={{ height: `${clamped * 100}%` }}
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/30" />
      </div>
    </div>
  );
};
