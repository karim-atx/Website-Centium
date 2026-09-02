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
    // Design refinement §6.1: "20px gradient-filled progress bar → 8
    // discrete 5px segments... discrete segments read as glasses and
    // align with the tabular numerals."
    const filled = Math.round(clamped * 8);
    return (
      <div className="relative flex gap-1 shrink-0" style={{ width, height }}>
        {exceeded && (
          <span className="absolute -inset-1 rounded-xl border-2 border-gold animate-pulse-ring-slow pointer-events-none" />
        )}
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="flex-1 rounded-[2px]"
            style={{
              height: 5,
              alignSelf: "center",
              // QA 12.0: "the water intake progress bar [should be] the same
              // color of the water in the detailed widget" — the detail
              // sheet's own vertical fill is sky-blue; this segmented bar
              // used teal instead.
              background: exceeded ? "rgb(var(--c-gold))" : i < filled ? "rgb(var(--c-sky))" : "#EDEBE8",
            }}
          />
        ))}
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
        <span className="absolute inset-0 rounded-2xl border-2 border-gold animate-pulse-ring-slow pointer-events-none" />
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
