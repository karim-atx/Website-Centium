// Bounds and validation for the body metrics collected in onboarding and
// editable later from the Profile tab.
//
// These live here rather than in one screen for the same reason the date-of-
// birth bounds do: there are two editors, and a range enforced in one but not
// the other is not a range. Both import from here, so the rule and the
// message are identical wherever a value is entered.
//
// V7 (QA 7.0) set the original figures — wide enough to allow any real
// person, narrow enough to catch a fat-fingered or joke value. They are
// sanity limits, not clinical ones: a value inside the range is plausible,
// not verified.

export const HEIGHT_RANGE = [100, 250] as const;
export const WEIGHT_RANGE = [25, 300] as const;

/** Returns a message to show the user, or null when the value is acceptable. */
export function validateHeightCm(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) return "Enter a valid height.";
  if (value < HEIGHT_RANGE[0] || value > HEIGHT_RANGE[1]) {
    return `Height should be between ${HEIGHT_RANGE[0]} and ${HEIGHT_RANGE[1]}cm.`;
  }
  return null;
}

/** Returns a message to show the user, or null when the value is acceptable. */
export function validateWeightKg(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) return "Enter a valid weight.";
  if (value < WEIGHT_RANGE[0] || value > WEIGHT_RANGE[1]) {
    return `Weight should be between ${WEIGHT_RANGE[0]} and ${WEIGHT_RANGE[1]}kg.`;
  }
  return null;
}
