// Which category a reading falls in, and nothing else.
//
// PURE AND BOUNDARY-ONLY. The words shown to a person live in ./guidance.ts,
// one module so a clinician can read every medical sentence this app says
// about blood pressure in one sitting. This file holds the arithmetic those
// words are chosen by, so the thresholds can be checked against the guideline
// without reading any React.
//
// 2025 AHA/ACC, for blood pressure measured at rest:
//
//   Normal      systolic < 120  AND  diastolic < 80
//   Elevated    systolic 120–129 AND diastolic < 80
//   Stage 1     systolic 130–139 OR  diastolic 80–89
//   Stage 2     systolic ≥ 140   OR  diastolic ≥ 90
//   Severe      systolic > 180   AND/OR diastolic > 120
//
// THE HIGHER CATEGORY WINS, which is the part an implementation gets wrong by
// writing the table out in reading order. 125/85 is Stage 1, not Elevated:
// the systolic sits in the Elevated band and the diastolic is already in
// Stage 1, and a person is classified by the worse of the two. So this
// evaluates from the top down and returns on the first match.
//
// SEVERE IS STRICTLY GREATER on both numbers, deliberately. 180/120 exactly is
// Stage 2; 181/120 and 180/121 are Severe. The guideline draws the crisis
// threshold ABOVE 180/120 rather than at it, and rounding that down would put
// a crisis message in front of somebody the guideline does not put it in front
// of.

export type BpCategory = "normal" | "elevated" | "stage1" | "stage2" | "severe";

/** The categories from least to most serious, for anything that ranks them. */
export const BP_CATEGORIES: readonly BpCategory[] = [
  "normal",
  "elevated",
  "stage1",
  "stage2",
  "severe",
] as const;

export function classifyBloodPressure(systolic: number, diastolic: number): BpCategory {
  // Top down, so the worse of the two numbers decides.
  if (systolic > 180 || diastolic > 120) return "severe";
  if (systolic >= 140 || diastolic >= 90) return "stage2";
  if (systolic >= 130 || diastolic >= 80) return "stage1";
  if (systolic >= 120) return "elevated";
  return "normal";
}

/**
 * True for a reading that needs saying something about immediately.
 *
 * Its own function rather than `=== "severe"` at each call site, because three
 * surfaces ask (the save path, the card and the detail view) and a fourth will.
 */
export function isSevere(systolic: number, diastolic: number): boolean {
  return classifyBloodPressure(systolic, diastolic) === "severe";
}

/** How many readings fall in each category. Absent categories are zero. */
export function categoryCounts(
  readings: readonly { systolic: number; diastolic: number }[]
): Record<BpCategory, number> {
  const counts = { normal: 0, elevated: 0, stage1: 0, stage2: 0, severe: 0 };
  for (const r of readings) counts[classifyBloodPressure(r.systolic, r.diastolic)] += 1;
  return counts;
}

/**
 * The mean of a set of readings, rounded to whole mmHg, or null when empty.
 *
 * AVERAGED OVER THE READINGS THAT EXIST, the same rule the other metrics
 * follow — never over a number of days, which would count an unmeasured day as
 * a reading of nothing.
 *
 * The average is NOT classified anywhere. A mean of two readings either side of
 * a boundary is not a diagnosis of the middle, and labelling it would invent a
 * category nobody measured.
 */
export function averageReading(
  readings: readonly { systolic: number; diastolic: number; pulse?: number | null }[]
): { systolic: number; diastolic: number; pulse: number | null } | null {
  if (readings.length === 0) return null;
  const mean = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  const pulses = readings.map((r) => r.pulse).filter((p): p is number => typeof p === "number");
  return {
    systolic: mean(readings.map((r) => r.systolic)),
    diastolic: mean(readings.map((r) => r.diastolic)),
    // Pulse is nullable on the row — not every cuff reports one — so it is
    // averaged over the readings that carry it, and is null when none do.
    pulse: pulses.length > 0 ? mean(pulses) : null,
  };
}

/**
 * Morning and evening, split at noon.
 *
 * BEFORE 12:00 IS MORNING, which is a convention rather than a fact about
 * bodies, and is chosen because it is the one the brief names and the one a
 * reader will assume. It splits on the LOCAL hour of the reading, so a
 * reading taken at 08:00 is a morning reading wherever the user was.
 */
export function splitByTimeOfDay<T extends { recordedAt: string }>(
  readings: readonly T[]
): { morning: T[]; evening: T[] } {
  const morning: T[] = [];
  const evening: T[] = [];
  for (const r of readings) {
    (new Date(r.recordedAt).getHours() < 12 ? morning : evening).push(r);
  }
  return { morning, evening };
}
