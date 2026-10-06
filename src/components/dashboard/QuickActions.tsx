import React from "react";

interface QuickActionsProps {
  onLogFood: () => void;
  onLogWorkout: () => void;
  onAddMetric: () => void;
  onVoiceLog: () => void;
}

// Handover 2026-09-29 HO1.1 + decision 6: the Quick Actions cluster rebuilt
// in CSS/SVG from the handover's artwork (assets/images/qa-cluster-ref-teal-
// transparent.png), replacing the flattened image. The container is
// transparent and every gap around the mic is a true cutout, so the page
// shows through in light and dark themes alike. The mic and the shapes
// around it keep a fixed size; the two side segments flex, so the bar fits
// the content width (the old scaled image cut off at 360).
//
// Geometry is in the artwork's own pixels (2164 x 727), measured from it:
// mic centre (1081, 298) r 188; pills y 190-392; the pills' cutout r 227;
// the bottom arc r 211-317 between 32.5 and 147.5 degrees; each wing reaches
// r 316 at 153 degrees. S turns artwork px into CSS px at the frame's width
// (the pills span 141-2022 = 1881 artwork px over 358 CSS px). Shapes are
// drawn inset by half a round-joined stroke of their own colour, which gives
// the artwork's rounded corners. The four white glyphs are cut from the same
// artwork (public/quick-actions/*.png), so they are untouched too.
const S = 358 / 1881;
const PURPLE = "rgb(var(--th-9591dc))";
const TEAL = "rgb(var(--th-95c0bb))";
const TOP = 114; // mic top: the cluster's top edge
const BOTTOM = 617; // bottom arc's lowest point
const CX = 1081;
const CY = 298;
const MIC_R = 188;
const CENTRE_LEFT = 660; // where the fixed centre meets the flexing left pill
const CENTRE_W = 2 * (CX - CENTRE_LEFT);
const PILL_TOP = 190;
const PILL_H = 202;

const px = (artwork: number) => artwork * S;
const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
};
const fmt = (p: readonly [number, number]) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;

// Inset by the stroke's half-width (10): cutout 237, arc 221-307, pills 200-382.
const HALF = 10;
const CUT = 227 + HALF;
const A = [CX - Math.sqrt(CUT ** 2 - (PILL_TOP + HALF - CY) ** 2), PILL_TOP + HALF] as const;
const B = polar(CUT, 155);
const C = polar(316 - HALF, 155);
const LEFT_WING = [
  `M${CENTRE_LEFT - 20},${PILL_TOP + HALF}`,
  `L${fmt(A)}`,
  `A${CUT},${CUT} 0 0 0 ${fmt(B)}`,
  `L${fmt(C)}`,
  `C770,410 720,${PILL_TOP + PILL_H - HALF} 680,${PILL_TOP + PILL_H - HALF}`,
  `L${CENTRE_LEFT - 20},${PILL_TOP + PILL_H - HALF}`,
  "Z",
].join(" ");
const I1 = polar(211 + HALF, 145.5);
const I2 = polar(211 + HALF, 34.5);
const O1 = polar(317 - HALF, 145.5);
const O2 = polar(317 - HALF, 34.5);
const ARC = `M${fmt(I1)} A${211 + HALF},${211 + HALF} 0 0 0 ${fmt(I2)} L${fmt(O2)} A${317 - HALF},${317 - HALF} 0 0 1 ${fmt(O1)} Z`;

const glyph = (name: string, w: number, h: number): React.CSSProperties => ({
  width: px(w),
  height: px(h),
  backgroundImage: `url(/quick-actions/${name}.png)`,
  backgroundSize: "100% 100%",
  pointerEvents: "none",
});

export const QuickActions: React.FC<QuickActionsProps> = ({ onLogFood, onLogWorkout, onAddMetric, onVoiceLog }) => {
  const pill: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    height: px(PILL_H),
    marginTop: px(PILL_TOP - TOP),
    background: PURPLE,
    position: "relative",
    border: "none",
    padding: 0,
  };
  return (
    <div className="animate-fade-slide-up">
      <p className="mb-[9px] text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42] dark:text-charcoal/[0.55]">Quick actions</p>

      <div className="relative flex" style={{ height: px(BOTTOM - TOP), marginTop: -8, marginBottom: -12 }}>
        {/* Log food: the left pill, its glyph 22.6px in from the centre. */}
        <button
          onClick={onLogFood}
          aria-label="Log food"
          className="tap"
          // Tucks 2px under the centre so no sub-pixel seam shows at the join.
          style={{ ...pill, marginRight: -2, borderRadius: `${px(PILL_H) / 2}px 0 0 ${px(PILL_H) / 2}px` }}
        >
          <span className="absolute" style={{ ...glyph("food", 150, 145), right: px(CENTRE_LEFT - 616), top: px(222 - PILL_TOP) }} />
        </button>

        {/* The fixed centre: both wings and the bottom arc. */}
        <svg
          width={px(CENTRE_W)}
          height={px(BOTTOM - TOP)}
          viewBox={`${CENTRE_LEFT} ${TOP} ${CENTRE_W} ${BOTTOM - TOP}`}
          className="flex-none block relative"
          aria-hidden
        >
          <g fill={PURPLE} stroke={PURPLE} strokeWidth={HALF * 2} strokeLinejoin="round">
            <path d={LEFT_WING} onClick={onLogFood} style={{ cursor: "pointer" }} />
            <path d={LEFT_WING} transform={`translate(${2 * CX} 0) scale(-1 1)`} onClick={onLogWorkout} style={{ cursor: "pointer" }} />
            <path d={ARC} onClick={onAddMetric} style={{ cursor: "pointer" }} />
          </g>
        </svg>

        {/* Log workout: the right pill. */}
        <button
          onClick={onLogWorkout}
          aria-label="Log workout"
          className="tap"
          style={{ ...pill, marginLeft: -2, borderRadius: `0 ${px(PILL_H) / 2}px ${px(PILL_H) / 2}px 0` }}
        >
          <span className="absolute" style={{ ...glyph("workout", 139, 155), left: px(1548 - (2 * CX - CENTRE_LEFT)), top: px(217 - PILL_TOP) }} />
        </button>

        {/* The mic: a fixed teal circle over the centre. */}
        <button
          onClick={onVoiceLog}
          aria-label="Tell Centium what you ate"
          className="tap absolute flex items-center justify-center"
          style={{
            left: "50%",
            top: px(CY - MIC_R - TOP),
            width: px(2 * MIC_R),
            height: px(2 * MIC_R),
            marginLeft: -px(MIC_R),
            borderRadius: 9999,
            background: TEAL,
            border: "none",
            padding: 0,
          }}
        >
          <span style={{ ...glyph("voice", 161, 204), transform: `translateY(${px(10)}px)` }} />
        </button>

        {/* Add metric: the bottom arc (its shape above takes taps too). */}
        <button
          onClick={onAddMetric}
          aria-label="Add metric"
          className="tap absolute flex items-start justify-center"
          style={{
            left: "50%",
            top: px(505 - TOP),
            width: px(2 * 250),
            height: px(BOTTOM - 505),
            marginLeft: -px(250),
            background: "transparent",
            border: "none",
            padding: 0,
          }}
        >
          <span style={{ ...glyph("metric", 107, 91), marginTop: px(509 - 505) }} />
        </button>
      </div>
    </div>
  );
};
