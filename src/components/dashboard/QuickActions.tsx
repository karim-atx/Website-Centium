import React from "react";
import { Mic } from "lucide-react";

interface QuickActionsProps {
  onLogFood: () => void;
  onLogWorkout: () => void;
  onAddMetric: () => void;
  onVoiceLog: () => void;
}

// Design handoff "Quick Actions — final design" (S4 · R3 · V1): replaces the
// old three gradient pills + teal voice bar entirely. Three lavender pills
// (Log food / Log workout / Add metric) plus a circular teal voice hub,
// absolutely positioned inside a 358x104 box — the dc.html "ref" markup
// (QaBlock.dc.html) is the literal source for every coordinate below; the
// README's prose table matches it exactly for this variant.
//
// The "Add metric" bottom pill must stay one continuous tap target and one
// continuous visual shape even though the voice hub visually dips into its
// upper portion. The gap-ring behind the hub is purely decorative (it shows
// the page background through the 5px gap) and is pointer-events-none so
// clicks in that ring fall through to the bottom pill underneath it; the hub
// itself is clipped to a circle (clip-path) so hit-testing matches its round
// shape instead of its square bounding box, which would otherwise steal a
// few corner-pixels of clicks from the bottom pill where the two overlap.
export const QuickActions: React.FC<QuickActionsProps> = ({
  onLogFood,
  onLogWorkout,
  onAddMetric,
  onVoiceLog,
}) => {
  const pillStyle: React.CSSProperties = {
    background: "#AEA1DC",
    borderRadius: 22,
    padding: 0,
    border: "none",
    textAlign: "left",
  };
  const dividerStyle: React.CSSProperties = {
    width: 1,
    height: 20,
    background: "rgba(255,255,255,0.45)",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: "#FFFFFF",
    whiteSpace: "nowrap",
  };

  return (
    <div className="animate-fade-slide-up">
      <p className="mb-[9px] text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42]">Quick actions</p>

      <div className="relative w-full" style={{ height: 104 }}>
        {/* Log food */}
        <button
          onClick={onLogFood}
          className="tap absolute"
          style={{ left: 0, top: 12, width: 165, height: 44, ...pillStyle }}
        >
          <span style={{ position: "absolute", left: 18, top: 0, height: 44, display: "flex", alignItems: "center" }}>
            <img src="/qa-icon-bowl.png" alt="" style={{ width: 21, height: 22, objectFit: "contain", display: "block" }} />
          </span>
          <span style={{ position: "absolute", left: 47, top: 0, height: 44, display: "flex", alignItems: "center" }}>
            <span style={dividerStyle} />
          </span>
          <span style={{ position: "absolute", left: 61, top: 0, height: 44, display: "flex", alignItems: "center", ...labelStyle }}>
            Log food
          </span>
        </button>

        {/* Log workout — icon sits at the pill's outer/right end, with the
            label unusually to the LEFT of the divider (matches the handoff's
            dc.html markup literally). */}
        <button
          onClick={onLogWorkout}
          className="tap absolute"
          style={{ left: 193, top: 12, width: 165, height: 44, ...pillStyle }}
        >
          <span style={{ position: "absolute", left: 330 - 193, top: 0, height: 44, display: "flex", alignItems: "center" }}>
            <img src="/qa-icon-runner.png" alt="" style={{ width: 18, height: 22, objectFit: "contain", display: "block" }} />
          </span>
          <span style={{ position: "absolute", left: 322 - 193, top: 0, height: 44, display: "flex", alignItems: "center" }}>
            <span style={dividerStyle} />
          </span>
          <span style={{ position: "absolute", left: 235 - 193, top: 0, height: 44, display: "flex", alignItems: "center", ...labelStyle }}>
            Log workout
          </span>
        </button>

        {/* Add metric — full-width bottom pill; stays one tap target even
            though the voice hub overlaps its upper-left portion. */}
        <button
          onClick={onAddMetric}
          className="tap absolute"
          style={{ left: 0, top: 60, width: 358, height: 44, ...pillStyle }}
        >
          <span style={{ position: "absolute", left: 18, top: 0, height: 44, display: "flex", alignItems: "center" }}>
            <img src="/qa-icon-bars.png" alt="" style={{ width: 19, height: 20, objectFit: "contain", display: "block" }} />
          </span>
          <span style={{ position: "absolute", left: 47, top: 0, height: 44, display: "flex", alignItems: "center" }}>
            <span style={dividerStyle} />
          </span>
          <span
            style={{
              position: "absolute",
              left: 226,
              top: 0,
              width: 132,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              ...labelStyle,
            }}
          >
            Add metric
          </span>
        </button>

        {/* Gap ring — decorative only, shows the page background through the
            5px gap around the hub; must not intercept clicks meant for the
            Add metric pill beneath it. */}
        <span
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            left: 132,
            top: 0,
            width: 94,
            height: 94,
            borderRadius: 999,
            background: "rgb(var(--c-cream))",
          }}
        />

        {/* Voice hub */}
        <button
          onClick={onVoiceLog}
          className="tap absolute flex flex-col items-center justify-center text-white"
          style={{
            left: 137,
            top: 5,
            width: 84,
            height: 84,
            borderRadius: 999,
            background: "linear-gradient(150deg, #A2C8C2, #6F9993)",
            gap: 3,
            clipPath: "circle(50%)",
            padding: 0,
            border: "none",
          }}
        >
          <Mic size={16} />
          <span style={{ width: 68, textAlign: "center", fontSize: 9.5, fontWeight: 700, lineHeight: 1.25 }}>
            Tell Centium what you ate
          </span>
        </button>
      </div>
    </div>
  );
};
