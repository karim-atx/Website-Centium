import React from "react";

// The progress ring, in weeks.
//
// FORTY SEGMENTS, ONE PER WEEK, deliberately matching CycleRing's choice of
// discrete segments over a smooth sweep: a pregnancy is counted in weeks, a
// scan reports weeks, and a continuous arc would imply the dating is precise
// to the hour when it is precise to a few days at best.
//
// NO FIGURE, NO FRUIT, NO SIZE COMPARISON in the middle. The centre holds the
// week and the trimester, because those are the two things a provider will
// ask for — and because a pregnancy that ends is a pregnancy whose app should
// not have been showing a cartoon.

const SIZE = 260;
const RADIUS = 104;
const STROKE = 17;
const WEEKS = 40;

const RING_COLOR = "#B8735A";
const RING_TRACK = "#E7D9D2";

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

export const PregnancyRing: React.FC<{
  /** Completed weeks. Past 40 the ring is simply full. */
  week: number;
  headline: string;
  subline?: string | null;
  footline?: string | null;
}> = ({ week, headline, subline, footline }) => {
  const step = 360 / WEEKS;
  const filled = Math.max(0, Math.min(WEEKS, week));

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width="100%"
      style={{ display: "block", maxWidth: SIZE, margin: "0 auto" }}
      role="img"
      aria-label={`${headline}${subline ? `. ${subline}` : ""}${footline ? `. ${footline}` : ""}`}
    >
      {Array.from({ length: WEEKS }, (_, i) => {
        const from = i * step + step * 0.14;
        const to = (i + 1) * step - step * 0.14;
        const done = i < filled;
        return (
          <path
            key={i}
            d={arcPath(from, to, RADIUS)}
            stroke={done ? RING_COLOR : RING_TRACK}
            strokeWidth={i === filled - 1 ? STROKE + 5 : STROKE}
            strokeLinecap="butt"
            fill="none"
            opacity={done ? (i === filled - 1 ? 1 : 0.72) : 1}
          />
        );
      })}

      <text
        x={SIZE / 2}
        y={SIZE / 2 - (subline || footline ? 8 : 0)}
        textAnchor="middle"
        style={{ fontSize: 21, fontWeight: 800, fill: "rgb(var(--c-charcoal))", letterSpacing: "-0.02em" }}
      >
        {headline}
      </text>
      {subline && (
        <text
          x={SIZE / 2}
          y={SIZE / 2 + 14}
          textAnchor="middle"
          style={{ fontSize: 11.5, fill: "rgb(var(--c-charcoal-faint))" }}
        >
          {subline}
        </text>
      )}
      {footline && (
        <text
          x={SIZE / 2}
          y={SIZE / 2 + 31}
          textAnchor="middle"
          style={{ fontSize: 11, fontWeight: 700, fill: RING_COLOR }}
        >
          {footline}
        </text>
      )}
    </svg>
  );
};

/** The three-trimester bar under the ring. Name AND fill, never fill alone. */
export const TrimesterBar: React.FC<{ active: 1 | 2 | 3 }> = ({ active }) => (
  <div className="flex gap-1.5">
    {([1, 2, 3] as const).map((t) => {
      const on = t === active;
      return (
        <div key={t} className="flex-1 min-w-0">
          <div
            className="h-1.5 rounded-full"
            style={{ background: RING_COLOR, opacity: on ? 1 : 0.24 }}
          />
          <p
            className="mt-1.5 text-[9.5px] text-center truncate"
            style={{
              color: on ? RING_COLOR : "rgb(var(--c-charcoal-faint))",
              fontWeight: on ? 700 : 500,
            }}
          >
            Trimester {t}
          </p>
        </div>
      );
    })}
  </div>
);

export const PREGNANCY_COLOR = RING_COLOR;
