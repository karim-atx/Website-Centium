import React from "react";
import { curvePoints, hormoneCurves, HORMONES, type Hormone } from "../../services/cycle/hormones";
import {
  HORMONE_DISCLAIMER,
  HORMONE_EXPLAINER,
  HORMONE_LABEL,
  HORMONE_TITLE,
} from "../../services/cycle/guidance";

// The typical hormone pattern, scaled to this user's cycle.
//
// THE DISCLAIMER IS IN THE HEADING, not a footnote and not a tooltip. Somebody
// glancing at five smooth curves over their own cycle days will read them as
// measurements unless told otherwise in the same breath as the title — so
// "Typical hormone pattern · illustrative, not measured" is one line, always
// rendered together.
//
// NO Y-AXIS NUMBERS, deliberately. Each curve is normalised to its own peak,
// so the axis has no unit and the curves' heights are not comparable with one
// another. Printing a 0–100 scale beside them would invent a quantity.

const COLORS: Record<Hormone, string> = {
  estrogen: "#C0577A",
  progesterone: "#8B6FC7",
  lh: "#4F9D6B",
  fsh: "#5BA3B8",
  testosterone: "#C98A3E",
};

const WIDTH = 320;
const HEIGHT = 96;

export const HormoneGraph: React.FC<{
  cycleLength: number;
  ovulationDay: number;
  /** Marked with a vertical line, when it is inside the drawn cycle. */
  selectedDay?: number | null;
}> = ({ cycleLength, ovulationDay, selectedDay }) => {
  const curves = hormoneCurves(cycleLength, ovulationDay);
  const length = Math.max(15, Math.min(90, Math.round(cycleLength)));
  const markerX =
    selectedDay && selectedDay >= 1 && selectedDay <= length
      ? ((selectedDay - 1) / Math.max(1, length - 1)) * WIDTH
      : null;

  return (
    <div>
      <p className="text-[11px] font-bold text-charcoal mb-0.5">
        {HORMONE_TITLE} <span className="font-medium text-charcoal-faint">· {HORMONE_DISCLAIMER}</span>
      </p>
      <p className="text-[10px] leading-[1.45] text-charcoal-faint mb-2">{HORMONE_EXPLAINER}</p>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        preserveAspectRatio="none"
        style={{ display: "block", overflow: "visible" }}
        role="img"
        aria-label={`${HORMONE_TITLE}, ${HORMONE_DISCLAIMER}`}
      >
        {/* Ovulation, as the one landmark the curves are built around. */}
        {(() => {
          const x = ((Math.round(ovulationDay) - 1) / Math.max(1, length - 1)) * WIDTH;
          return (
            <line
              x1={x}
              y1={0}
              x2={x}
              y2={HEIGHT}
              stroke="rgb(var(--c-charcoal))"
              strokeOpacity={0.14}
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          );
        })()}
        {markerX !== null && (
          <line
            x1={markerX}
            y1={0}
            x2={markerX}
            y2={HEIGHT}
            stroke="rgb(var(--c-charcoal))"
            strokeOpacity={0.4}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {HORMONES.map((h) => (
          <polyline
            key={h}
            points={curvePoints(curves[h], WIDTH, HEIGHT, length)}
            fill="none"
            stroke={COLORS[h]}
            strokeWidth={1.6}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {HORMONES.map((h) => (
          <span key={h} className="flex items-center gap-1 text-[9.5px] text-charcoal-soft">
            <span className="w-2.5 h-[2px] rounded-full" style={{ background: COLORS[h] }} />
            {HORMONE_LABEL[h]}
          </span>
        ))}
      </div>
    </div>
  );
};
