import React from "react";
import { curvePoints, hormoneCurves, HORMONES, type Hormone } from "../../services/cycle/hormones";
import { HORMONE_DISCLAIMER, HORMONE_EXPLAINER, HORMONE_LABEL, HORMONE_TITLE } from "../../services/cycle/guidance";
import { useIsDark } from "../../hooks/useIsDark";
import { linePx, textPx } from "../../theme/textSize";
import { isRtl, t } from "../../i18n/core";

// The typical hormone pattern, scaled to this user's cycle (HE1.10 #29-#37).
//
// THE DISCLAIMER IS IN THE HEADING, not a footnote and not a tooltip:
// "Typical hormone pattern · Illustrative, not measured" is one line, always
// rendered together. HORMONE_EXPLAINER stays visible under it (KEEP-SAFETY,
// release review: main showed it; it says the curve is not from a blood test).
//
// NO Y-AXIS NUMBERS, deliberately. Each curve is normalised to its own peak,
// so the axis has no unit.
//
// The curves keep the repo colours (an illustration, not data: board note).
// Dark (* derived): estrogen and progesterone are lifted to reach 4.5:1 on
// the #1C1F28 card (#C0577A 3.8:1 → #D4799A 5.5:1; #8B6FC7 4.1:1 → #A08AD6
// 5.6:1); LH, FSH and testosterone already pass and stay.

const COLORS: Record<Hormone, string> = {
  estrogen: "#C0577A",
  progesterone: "#8B6FC7",
  lh: "#4F9D6B",
  fsh: "#5BA3B8",
  testosterone: "#C98A3E",
};
const COLORS_DARK: Record<Hormone, string> = { ...COLORS, estrogen: "#D4799A", progesterone: "#A08AD6" };

/** Graphic 328.9 × 80 (#32): the curves in the top 62, the marker's "Day N" under them. */
const WIDTH = 328.9;
const HEIGHT = 80;
const PLOT = 60;

export const HormoneGraph: React.FC<{
  cycleLength: number;
  ovulationDay: number;
  /** Marked with a vertical line and "Day N", when it is inside the drawn cycle. */
  selectedDay?: number | null;
  /** Recovery-sensitive mode: the marker carries no day number. */
  hideDayLabel?: boolean;
}> = ({ cycleLength, ovulationDay, selectedDay, hideDayLabel }) => {
  const dark = useIsDark();
  const colors = dark ? COLORS_DARK : COLORS;
  const curves = hormoneCurves(cycleLength, ovulationDay);
  const length = Math.max(15, Math.min(90, Math.round(cycleLength)));
  // Round F (F10): in right to left, the cycle runs from right to left. The
  // curves are mirrored by their transform, the lines by their x; the "Day N"
  // tag is placed from the inline start (so it takes the unmirrored fraction).
  const rtl = isRtl();
  const ux = (day: number) => ((day - 1) / Math.max(1, length - 1)) * WIDTH;
  const xOf = (day: number) => (rtl ? WIDTH - ux(day) : ux(day));
  const markerX = selectedDay && selectedDay >= 1 && selectedDay <= length ? xOf(selectedDay) : null;
  const ovuX = xOf(Math.round(ovulationDay));

  return (
    <div>
      <p className="uppercase text-primary-deep-text" style={{ fontSize: textPx(9.5), lineHeight: linePx(14.3), fontWeight: 800, letterSpacing: 1.3 }}>
        {t(HORMONE_TITLE)}{" "}
        <span className="normal-case text-charcoal-faint" style={{ fontWeight: 600, letterSpacing: 0 }}>
          · {t(HORMONE_DISCLAIMER)}
        </span>
      </p>
      <p className="text-charcoal-faint" style={{ marginTop: 2, marginBottom: 8, fontSize: textPx(10), lineHeight: linePx(15), fontWeight: 400 }}>
        {HORMONE_EXPLAINER}
      </p>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        preserveAspectRatio="none"
        style={{ display: "block", overflow: "visible", marginTop: 12 }}
        role="img"
        aria-label={
          markerX !== null && !hideDayLabel
            ? t("{title}, {disclaimer}. Day {n} marked", { title: t(HORMONE_TITLE), disclaimer: t(HORMONE_DISCLAIMER), n: selectedDay as number })
            : t("{title}, {disclaimer}", { title: t(HORMONE_TITLE), disclaimer: t(HORMONE_DISCLAIMER) })
        }
      >
        {/* Ovulation, the one landmark the curves are built around (repo): dashed. */}
        <line x1={ovuX} y1={0} x2={ovuX} y2={PLOT} stroke="rgb(var(--c-charcoal))" strokeOpacity={0.18} strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        {HORMONES.map((h) => (
          <polyline
            key={h}
            transform={rtl ? `matrix(-1 0 0 1 ${WIDTH} 2)` : "translate(0 2)"}
            points={curvePoints(curves[h], WIDTH, PLOT - 4, length)}
            fill="none"
            stroke={colors[h]}
            strokeWidth={1.6}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {markerX !== null && (
          <g data-marker-day={selectedDay}>
            <line x1={markerX} y1={0} x2={markerX} y2={PLOT} stroke="rgb(var(--c-charcoal))" strokeOpacity={0.75} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
            <circle cx={markerX} cy={0} r={2.6} fill="rgb(var(--c-charcoal))" />
          </g>
        )}
      </svg>
      {markerX !== null && !hideDayLabel && (
        <div className="relative" style={{ height: 0 }}>
          <span
            className="absolute text-charcoal whitespace-nowrap"
            style={{
              insetInlineStart: `${(ux(selectedDay as number) / WIDTH) * 100}%`,
              transform: rtl ? "translateX(50%)" : "translateX(-50%)",
              top: -(HEIGHT - PLOT) + 4,
              fontSize: textPx(9.5),
              lineHeight: linePx(12),
              fontWeight: 700,
            }}
          >
            {t("Day {n}", { n: selectedDay as number })}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap" style={{ marginTop: 6, columnGap: 8, rowGap: 2 }}>
        {HORMONES.map((h) => (
          <span key={h} className="inline-flex items-center uppercase" style={{ gap: 4, color: colors[h], fontSize: textPx(8), lineHeight: linePx(12), fontWeight: 800, letterSpacing: 0.8 }}>
            <span aria-hidden style={{ width: 8, height: 2, borderRadius: 1, background: colors[h] }} />
            {t(HORMONE_LABEL[h])}
          </span>
        ))}
      </div>
    </div>
  );
};
