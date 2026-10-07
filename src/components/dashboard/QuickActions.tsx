import React, { useLayoutEffect, useRef, useState } from "react";

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
//
// BATCH E (E7): ONE SHAPE PER SIDE. The pills were CSS boxes beside an SVG
// wing, and the two never met cleanly: a step on the top edge and a hard
// corner where the wing's bulge met the pill's bottom. Each side is now a
// single SVG outline (sideShape): the round pill end, the flat top, a rounded
// corner into the mic cutout, the cutout, rounded corners at the wing tip, and
// the artwork's wide fillet from the tip back into the pill's bottom. The SVG
// spans the measured row width (in artwork units), so the pills still flex;
// the buttons on top are transparent tap areas holding the glyphs. The shape
// is excluded from the larger-icons scale (.qa-shape in index.css).
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

// The bottom arc is drawn inset by the stroke's half-width (10): r 221-307.
const HALF = 10;
// One side's outline in artwork units, outer edge (no stroke), for a row
// whose left end is at x = left. The right side is its mirror about CX.
const RC = 20; // corner radius at the cutout and the wing tip
function sideShape(left: number): string {
  const r = PILL_H / 2;
  const top = PILL_TOP;
  const bottom = PILL_TOP + PILL_H;
  const cut = 227;
  const deg = (r0: number, d: number) => polar(r0, d);
  // Where the top edge meets the cutout, and the angle there.
  const jx = CX - Math.sqrt(cut ** 2 - (top - CY) ** 2);
  const jDeg = (Math.atan2(top - CY, jx - CX) * 180) / Math.PI + 360; // ~208
  const step = (RC / cut) * (180 / Math.PI);
  const tipIn = deg(cut, 155);
  const tipOut = deg(316, 155);
  // The fillet from the tip back to the pill bottom, starting RC along it.
  const c1 = [760, 418] as const;
  const dx = c1[0] - tipOut[0];
  const dy = c1[1] - tipOut[1];
  const len = Math.hypot(dx, dy);
  const t2 = [tipOut[0] + (dx / len) * RC, tipOut[1] + (dy / len) * RC] as const;
  return [
    `M${fmt([left + r, top])}`,
    `L${fmt([jx - RC, top])}`,
    `Q${fmt([jx, top])} ${fmt(deg(cut, jDeg - step))}`,
    `A${cut},${cut} 0 0 0 ${fmt(deg(cut, 155 + step))}`,
    `Q${fmt(tipIn)} ${fmt(deg(cut + RC, 155))}`,
    `L${fmt(deg(316 - RC, 155))}`,
    `Q${fmt(tipOut)} ${fmt(t2)}`,
    `C745,410 712,${bottom} 662,${bottom}`,
    `L${fmt([left + r, bottom])}`,
    `A${r},${r} 0 0 1 ${fmt([left + r, top])}`,
    "Z",
  ].join(" ");
}

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
  // The row's width in CSS px, measured, so the shapes span it exactly.
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowW, setRowW] = useState(358);
  useLayoutEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const read = () => setRowW(el.getBoundingClientRect().width || 358);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const artW = rowW / S;
  const left = CX - artW / 2;
  const pill: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    height: px(PILL_H),
    marginTop: px(PILL_TOP - TOP),
    background: "transparent",
    position: "relative",
    border: "none",
    padding: 0,
  };
  return (
    <div className="animate-fade-slide-up">
      <p className="mb-[9px] text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42] dark:text-charcoal/[0.55]">Quick actions</p>

      <div ref={rowRef} className="relative flex" style={{ height: px(BOTTOM - TOP), marginTop: -8, marginBottom: -12 }}>
        {/* The drawing: both sides (pill and wing as one outline) and the
            bottom arc, under the transparent buttons. */}
        <svg
          width={rowW}
          height={px(BOTTOM - TOP)}
          viewBox={`${left.toFixed(1)} ${TOP} ${artW.toFixed(1)} ${BOTTOM - TOP}`}
          className="qa-shape absolute inset-0 block"
          aria-hidden
        >
          <path d={sideShape(left)} fill={PURPLE} onClick={onLogFood} style={{ cursor: "pointer" }} />
          <path d={sideShape(left)} fill={PURPLE} transform={`translate(${2 * CX} 0) scale(-1 1)`} onClick={onLogWorkout} style={{ cursor: "pointer" }} />
          <path d={ARC} fill={PURPLE} stroke={PURPLE} strokeWidth={HALF * 2} strokeLinejoin="round" onClick={onAddMetric} style={{ cursor: "pointer" }} />
        </svg>

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

        {/* The fixed centre's width, so the pills' tap areas and glyphs keep
            their place. */}
        <span aria-hidden className="flex-none block" style={{ width: px(CENTRE_W) }} />

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
