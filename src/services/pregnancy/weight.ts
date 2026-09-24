import { FIRST_TRIMESTER_GAIN_KG, WEIGHT_GAIN_RANGES, type WeightGainRange } from "./guidance";
import { GESTATION_DAYS } from "./weeks";

// The weight-gain range, and where a real weigh-in sits against it.
//
// PURE, AND NULL WHENEVER A PIECE IS MISSING. The range depends on a
// pre-pregnancy BMI, which depends on a height and a weight from before the
// pregnancy — three things the app may not have. Every function here returns
// null rather than substituting a default, because a gain range computed from
// an assumed height is advice for somebody else.

export interface GainRange {
  range: WeightGainRange;
  bmi: number;
  /** Total recommended gain at term, in kg. */
  minKg: number;
  maxKg: number;
}

/** The IOM band a pre-pregnancy BMI falls in, or null without both inputs. */
export function gainRangeFor(
  heightCm: number | null,
  prePregnancyKg: number | null
): GainRange | null {
  if (!heightCm || heightCm <= 0 || !prePregnancyKg || prePregnancyKg <= 0) return null;
  const metres = heightCm / 100;
  const bmi = prePregnancyKg / (metres * metres);
  const range = WEIGHT_GAIN_RANGES.find(
    (r) => bmi >= r.bmiFrom && (r.bmiTo === null || bmi < r.bmiTo)
  );
  if (!range) return null;
  return { range, bmi: Math.round(bmi * 10) / 10, minKg: range.minKg, maxKg: range.maxKg };
}

/**
 * The gain expected BY A GIVEN WEEK, not at term.
 *
 * THE FIRST TRIMESTER IS NOT A THIRTEENTH OF THE TOTAL. Recommended gain is
 * roughly 0.5–2 kg across the whole first trimester and then steady through
 * the second and third — so spreading the term total evenly across 40 weeks
 * would tell somebody at week 10 that they are several kilos behind when they
 * are exactly where they should be.
 *
 * Modelled as: a fixed first-trimester allowance, then the remainder spread
 * linearly over the weeks that follow.
 */
const FIRST_TRIMESTER_WEEKS = 13;
const TERM_WEEKS = GESTATION_DAYS / 7;

export function expectedGainByWeek(
  gain: GainRange,
  week: number
): { minKg: number; maxKg: number } | null {
  if (week < 0) return null;
  const w = Math.min(week, TERM_WEEKS);

  if (w <= FIRST_TRIMESTER_WEEKS) {
    const fraction = w / FIRST_TRIMESTER_WEEKS;
    return {
      minKg: round1(FIRST_TRIMESTER_GAIN_KG.min * fraction),
      maxKg: round1(FIRST_TRIMESTER_GAIN_KG.max * fraction),
    };
  }

  const laterWeeks = TERM_WEEKS - FIRST_TRIMESTER_WEEKS;
  const through = (w - FIRST_TRIMESTER_WEEKS) / laterWeeks;
  return {
    minKg: round1(FIRST_TRIMESTER_GAIN_KG.min + (gain.minKg - FIRST_TRIMESTER_GAIN_KG.min) * through),
    maxKg: round1(FIRST_TRIMESTER_GAIN_KG.max + (gain.maxKg - FIRST_TRIMESTER_GAIN_KG.max) * through),
  };
}

export type GainVerdict = "below" | "within" | "above";

/**
 * Where an actual gain sits against the expected band for that week.
 *
 * REPORTED, NOT JUDGED. The caller shows this as a position on a band; the
 * copy around it never tells anybody to eat more or less, because gestational
 * weight is one of the things people are most often made to feel badly about
 * and the range is a population guide rather than a target to hit.
 */
export function gainVerdict(
  actualKg: number,
  expected: { minKg: number; maxKg: number }
): GainVerdict {
  if (actualKg < expected.minKg) return "below";
  if (actualKg > expected.maxKg) return "above";
  return "within";
}

/** Gain so far, or null without a pre-pregnancy weight and a current one. */
export function gainSoFar(
  prePregnancyKg: number | null,
  latestKg: number | null
): number | null {
  if (!prePregnancyKg || !latestKg) return null;
  return round1(latestKg - prePregnancyKg);
}

const round1 = (n: number) => Math.round(n * 10) / 10;
