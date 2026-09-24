// The typical hormone pattern, stretched to one person's predicted cycle.
//
// THIS MEASURES NOTHING, and the module is built so that it cannot pretend
// otherwise: it takes a cycle length and an ovulation day and returns a curve.
// No logged value reaches it, because no logged value could — nothing in this
// app assays a hormone, and the graph says so on its face (see
// HORMONE_DISCLAIMER in ./guidance).
//
// WHAT IT IS FOR. A textbook cycle diagram is drawn for a 28-day cycle
// ovulating on day 14. Somebody with a 34-day cycle ovulating on day 20 looks
// at that diagram and reads their own position wrong. Scaling the same shape
// to their predicted dates is the difference between a picture of a cycle and
// a picture of THEIR cycle — still an illustration, but one whose x-axis is
// theirs.
//
// HOW IT IS SCALED, and the choice that matters: the follicular phase stretches
// and the luteal phase does not. Luteal length is near-constant across people
// (roughly 12–14 days); cycle-length variation lives almost entirely before
// ovulation. Stretching both halves evenly would put the progesterone peak in
// the wrong place for every cycle that is not 28 days — which is most of them.

/** The five curves drawn, in the order they are stacked in the legend. */
export const HORMONES = ["estrogen", "progesterone", "lh", "fsh", "testosterone"] as const;
export type Hormone = (typeof HORMONES)[number];

export interface HormonePoint {
  /** Cycle day, 1-based. */
  day: number;
  /** 0–1, relative to that hormone's own peak. NOT a concentration. */
  value: number;
}

export type HormoneCurves = Record<Hormone, HormonePoint[]>;

/**
 * A bell around `centre`, `width` days wide at the base.
 *
 * Gaussian rather than a spline through control points, because it is one
 * line, it is smooth everywhere, and it cannot overshoot into negative
 * territory the way a cubic through hand-placed points does at the ends.
 */
function bell(day: number, centre: number, width: number): number {
  const sigma = width / 2.355; // full width at half maximum
  return Math.exp(-((day - centre) ** 2) / (2 * sigma * sigma));
}

/** Clamped to [0, 1]; a curve is a shape, never a negative quantity. */
const unit = (v: number) => Math.max(0, Math.min(1, v));

/**
 * The five curves for one cycle.
 *
 * `cycleLength` and `ovulationDay` come from the prediction. A cycle with no
 * ovulation estimate — hormonal contraception, pregnancy — must not call this
 * at all; the caller hides the graph instead, because there is no natural
 * cycle for the illustration to describe.
 */
export function hormoneCurves(cycleLength: number, ovulationDay: number): HormoneCurves {
  // Guard rails, so a strange prediction produces a strange-looking but
  // finite curve rather than a division by zero.
  const length = Math.max(15, Math.min(90, Math.round(cycleLength)));
  const ovulation = Math.max(5, Math.min(length - 3, Math.round(ovulationDay)));
  const lutealSpan = length - ovulation;

  const curves = {
    estrogen: [],
    progesterone: [],
    lh: [],
    fsh: [],
    testosterone: [],
  } as HormoneCurves;

  for (let day = 1; day <= length; day++) {
    // ESTROGEN: a large peak just before ovulation, a fall, then a smaller
    // second rise mid-luteal.
    const estrogen = unit(
      0.1 +
        0.95 * bell(day, ovulation - 1, Math.max(6, ovulation * 0.55)) +
        0.42 * bell(day, ovulation + lutealSpan * 0.5, Math.max(6, lutealSpan * 0.8))
    );

    // PROGESTERONE: flat until ovulation, then a broad luteal dome that falls
    // away in the last days before the next period.
    const progesterone = unit(
      0.05 + (day < ovulation ? 0 : 0.95 * bell(day, ovulation + lutealSpan * 0.55, lutealSpan * 1.05))
    );

    // LH: the sharp surge that triggers ovulation. Narrow on purpose — it is
    // roughly a day, and drawing it wide is the most common way these
    // diagrams mislead.
    const lh = unit(0.08 + 0.92 * bell(day, ovulation - 0.5, 3));

    // FSH: a rise in the early follicular phase, a small mid-cycle bump with
    // the LH surge, and a late rise as the next cycle is recruited.
    const fsh = unit(
      0.25 +
        0.45 * bell(day, 3, 7) +
        0.4 * bell(day, ovulation - 0.5, 3.5) +
        0.35 * bell(day, length + 1, 6)
    );

    // TESTOSTERONE: a gentle mid-cycle rise on a high baseline. Small by
    // comparison, and drawn that way.
    const testosterone = unit(0.35 + 0.3 * bell(day, ovulation, Math.max(8, length * 0.4)));

    curves.estrogen.push({ day, value: estrogen });
    curves.progesterone.push({ day, value: progesterone });
    curves.lh.push({ day, value: lh });
    curves.fsh.push({ day, value: fsh });
    curves.testosterone.push({ day, value: testosterone });
  }

  return curves;
}

/**
 * The ovulation day implied by a prediction, or null.
 *
 * FROM THE DATES THE DATABASE GAVE, never re-derived. `my_cycle_prediction`
 * already decides where ovulation falls, taking luteal length and irregularity
 * into account; computing `cycleLength - lutealLength` here would be a second
 * opinion that disagrees with the ring drawn beside it.
 */
export function ovulationDayFrom(
  cycleDay: number | null,
  today: string,
  ovulationEstimate: string | null
): number | null {
  if (cycleDay === null || ovulationEstimate === null) return null;
  const days = daysBetween(today, ovulationEstimate);
  const day = cycleDay + days;
  return day > 0 ? day : null;
}

/** Whole days from `a` to `b`, by UTC date, so no DST hour shifts the count. */
export function daysBetween(a: string, b: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86400000);
}

/** An SVG polyline for one curve, in a 0..width × 0..height box. */
export function curvePoints(
  points: HormonePoint[],
  width: number,
  height: number,
  cycleLength: number
): string {
  if (points.length === 0) return "";
  const span = Math.max(1, cycleLength - 1);
  return points
    .map((p) => {
      const x = ((p.day - 1) / span) * width;
      const y = height - p.value * height;
      return `${round(x)},${round(y)}`;
    })
    .join(" ");
}

const round = (n: number) => Math.round(n * 100) / 100;
