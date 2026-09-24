import React from "react";
import type { CyclePhase } from "../../services/cycle/types";
import { PHASE_COLOR, PHASE_LABEL } from "../../services/cycle/guidance";

// The ring of cycle days, coloured by phase, with the selected day at the
// bottom.
//
// AT THE BOTTOM, NOT THE TOP, which is the preview's choice and a good one:
// the headline sits above the ring, so the selected day's marker reads as
// pointing at it rather than away from it, and the eye travels marker →
// headline without crossing the ring.
//
// ONE SEGMENT PER DAY. Not a smooth gradient: a cycle is counted in whole
// days, the user taps a day, and a continuous sweep would imply a precision
// the prediction does not have. The gaps between segments are the honest
// rendering of "day 12" being a thing and "day 12.4" not being one.

const SIZE = 260;
const RADIUS = 104;
const STROKE = 17;

/** Polar to cartesian, with 0° at the BOTTOM and running clockwise. */
function pointAt(angleDeg: number, radius: number) {
  const rad = ((angleDeg + 90) * Math.PI) / 180;
  return { x: SIZE / 2 + radius * Math.cos(rad), y: SIZE / 2 + radius * Math.sin(rad) };
}

function arcPath(fromDeg: number, toDeg: number, radius: number): string {
  const a = pointAt(fromDeg, radius);
  const b = pointAt(toDeg, radius);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${large} 1 ${b.x} ${b.y}`;
}

export const CycleRing: React.FC<{
  cycleLength: number;
  /** The day the ring is centred on, 1-based. */
  selectedDay: number;
  /** Which phase each day belongs to. Index 0 is day 1. */
  phaseOfDay: (day: number) => CyclePhase;
  /** Big number in the middle. */
  headline: string;
  /** Small line under it. */
  subline?: string | null;
  onSelectDay?: (day: number) => void;
}> = ({ cycleLength, selectedDay, phaseOfDay, headline, subline, onSelectDay }) => {
  const length = Math.max(1, Math.round(cycleLength));
  const step = 360 / length;
  // The selected day is rotated to the bottom, so the whole ring turns as the
  // scrubber moves rather than a marker sliding around a fixed ring.
  const rotation = -(selectedDay - 1) * step;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width="100%"
      style={{ display: "block", maxWidth: SIZE, margin: "0 auto" }}
      role="img"
      aria-label={`Cycle day ${selectedDay} of about ${length}. ${headline}`}
    >
      <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "50% 50%", transition: "transform 240ms ease" }}>
        {Array.from({ length }, (_, i) => {
          const day = i + 1;
          const phase = phaseOfDay(day);
          const from = i * step + step * 0.12;
          const to = (i + 1) * step - step * 0.12;
          const isSelected = day === selectedDay;
          return (
            <path
              key={day}
              d={arcPath(from, to, RADIUS)}
              stroke={PHASE_COLOR[phase]}
              strokeWidth={isSelected ? STROKE + 6 : STROKE}
              strokeLinecap="butt"
              fill="none"
              opacity={isSelected ? 1 : 0.62}
              style={{ cursor: onSelectDay ? "pointer" : undefined }}
              onClick={onSelectDay ? () => onSelectDay(day) : undefined}
            />
          );
        })}
      </g>

      {/* The marker stays at the bottom; the ring turns under it. */}
      <circle cx={SIZE / 2} cy={SIZE / 2 + RADIUS} r={4.5} fill="#241F1B" opacity={0.85} />

      <text
        x={SIZE / 2}
        y={SIZE / 2 - (subline ? 6 : 0)}
        textAnchor="middle"
        style={{ fontSize: 21, fontWeight: 800, fill: "rgb(var(--c-charcoal))", letterSpacing: "-0.02em" }}
      >
        {headline}
      </text>
      {subline && (
        <text
          x={SIZE / 2}
          y={SIZE / 2 + 18}
          textAnchor="middle"
          style={{ fontSize: 11.5, fill: "rgb(var(--c-charcoal-faint))" }}
        >
          {subline}
        </text>
      )}
    </svg>
  );
};

/** The four-phase bar under the ring. Colour AND name, never colour alone. */
export const PhaseBar: React.FC<{ phases: readonly CyclePhase[]; active: CyclePhase }> = ({
  phases,
  active,
}) => (
  <div className="flex gap-1.5">
    {phases.map((p) => {
      const on = p === active;
      return (
        <div key={p} className="flex-1 min-w-0">
          <div
            className="h-1.5 rounded-full"
            style={{ background: PHASE_COLOR[p], opacity: on ? 1 : 0.28 }}
          />
          <p
            className="mt-1.5 text-[9.5px] text-center truncate"
            style={{
              color: on ? PHASE_COLOR[p] : "rgb(var(--c-charcoal-faint))",
              fontWeight: on ? 700 : 500,
            }}
          >
            {PHASE_LABEL[p]}
          </p>
        </div>
      );
    })}
  </div>
);
