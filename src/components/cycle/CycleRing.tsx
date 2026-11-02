import React from "react";
import type { CyclePhase } from "../../services/cycle/types";
import { PHASE_LABEL, phaseThemeColor } from "../../services/cycle/guidance";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { linePx, textPx } from "../../theme/textSize";
import { t } from "../../i18n/core";

// The ring of cycle days (HE1.10 #10, HE1.10.d #10).
//
// ONE DOT PER DAY, evenly spaced and coloured by phase through the theme
// mapping (Period primary-deep, Follicular primary, Ovulation secondary-deep,
// Luteal secondary: V6-110). A cycle is counted in whole days, the user taps a
// day, and a continuous sweep would imply a precision the prediction does not
// have.
//
// THE SELECTED DAY SITS AT THE BOTTOM, ringed and numbered, and the whole ring
// turns as the scrubber moves rather than a marker sliding round a fixed
// ring (repo rule, kept). The turn follows within 120 ms (HE1.10.d); under
// Reduce motion it jumps.
//
// The centre text is on three lines. Its sizes are not in the layout table
// (the ring is one inline-SVG row, #10): measured on the 2x PNG.

const SIZE = 160;
/** Radius of the dot centres (2x PNG: ~127 pt across). */
const RADIUS = 63.5;

/** Polar to cartesian, 0° at the BOTTOM, clockwise. */
function pointAt(angleDeg: number, radius: number) {
  const rad = ((angleDeg + 90) * Math.PI) / 180;
  return { x: SIZE / 2 + radius * Math.cos(rad), y: SIZE / 2 + radius * Math.sin(rad) };
}

export const CycleRing: React.FC<{
  cycleLength: number;
  /** The day the ring is centred on, 1-based. */
  selectedDay: number;
  phaseOfDay: (day: number) => CyclePhase;
  /** The three centre lines (top small, middle large, bottom small); any may be empty. */
  lines: [string, string, string];
  /** Recovery-sensitive mode: the selected dot carries no day number. */
  hideNumber?: boolean;
  onSelectDay?: (day: number) => void;
  ariaLabel: string;
}> = ({ cycleLength, selectedDay, phaseOfDay, lines, hideNumber, onSelectDay, ariaLabel }) => {
  const length = Math.max(1, Math.round(cycleLength));
  const step = 360 / length;
  const rotation = -(selectedDay - 1) * step;
  const reduced = useReducedMotion();
  // 2x PNG: dots ~8.4 pt across at 28 days; smaller for long cycles so they
  // never touch.
  const dotR = Math.min(4.2, ((Math.PI * 2 * RADIUS) / length) * 0.32);

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label={ariaLabel} style={{ display: "block", overflow: "visible" }}>
        <g
          data-ring-rotation={rotation}
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "50% 50%",
            transition: reduced ? "none" : "transform 120ms ease-out",
          }}
        >
          {Array.from({ length }, (_, i) => {
            const day = i + 1;
            if (day === selectedDay) return null;
            const p = pointAt(i * step, RADIUS);
            return (
              <circle
                key={day}
                cx={p.x}
                cy={p.y}
                r={dotR}
                fill={phaseThemeColor(phaseOfDay(day))}
                data-phase={phaseOfDay(day)}
                style={{ cursor: onSelectDay ? "pointer" : undefined }}
                onClick={onSelectDay ? () => onSelectDay(day) : undefined}
              />
            );
          })}
        </g>
        {/* The selected day: ringed and numbered at the bottom (2x PNG: 21 pt,
            1.6 charcoal ring, page-coloured fill, 9.5 / 700 number). */}
        <g data-selected-day={selectedDay}>
          <circle cx={SIZE / 2} cy={SIZE / 2 + RADIUS} r={10.5} fill="rgb(var(--c-cream-card))" stroke="rgb(var(--c-charcoal))" strokeWidth={1.6} />
          {!hideNumber && (
            <text
              x={SIZE / 2}
              y={SIZE / 2 + RADIUS}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fontSize: textPx(9.5), fontWeight: 700, fill: "rgb(var(--c-charcoal))", fontVariantNumeric: "tabular-nums" }}
            >
              {selectedDay}
            </text>
          )}
        </g>
      </svg>
      <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none" style={{ padding: "0 28px" }}>
        {lines[0] && (
          <span className="text-charcoal" style={{ fontSize: textPx(11.5), lineHeight: linePx(15), fontWeight: 500 }}>
            {lines[0]}
          </span>
        )}
        {lines[1] && (
          <span className="text-charcoal" style={{ fontSize: textPx(20), lineHeight: linePx(25), fontWeight: 800, letterSpacing: -0.4 }}>
            {lines[1]}
          </span>
        )}
        {lines[2] && (
          <span className="text-charcoal-faint" style={{ fontSize: textPx(11), lineHeight: linePx(15), fontWeight: 500 }}>
            {lines[2]}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * The four-phase bar (HE1.10 #14-#21): pills 4 tall r9999 in the phase
 * colour, 0.3 except the active one; under each, its name in small caps 9/20
 * 700 ls1.1 #8C8378, the active one as a pill 9/13.5 800 #5F5093 on
 * #AEA1DC@22% pad 0 9 (dark #C3B3FB / #A991FE@22%). Colour AND name, never
 * colour alone.
 */
export const PhaseBar: React.FC<{ phases: readonly CyclePhase[]; active: CyclePhase }> = ({ phases, active }) => (
  <div className="flex" style={{ gap: 6 }} role="list" aria-label={t("Cycle phases")}>
    {phases.map((p) => {
      const on = p === active;
      return (
        <div key={p} role="listitem" aria-current={on || undefined} className="flex-1 min-w-0 flex flex-col items-center">
          <div className="w-full rounded-full" data-phase-pill={p} style={{ height: 4, background: phaseThemeColor(p), opacity: on ? 1 : 0.3 }} />
          <div className="flex items-center justify-center" style={{ marginTop: 5, height: 20 }}>
            <span
              className={`uppercase whitespace-nowrap rounded-full ${on ? "text-primary-deep-text" : "text-charcoal-faint"}`}
              style={
                on
                  ? { fontSize: textPx(9), lineHeight: linePx(13.5), fontWeight: 800, letterSpacing: 1.1, padding: "3.25px 9px", background: "rgb(var(--c-primary) / 0.22)" }
                  : { fontSize: textPx(9), lineHeight: linePx(20), fontWeight: 700, letterSpacing: 1.1 }
              }
            >
              {PHASE_LABEL[p]}
            </span>
          </div>
        </div>
      );
    })}
  </div>
);
