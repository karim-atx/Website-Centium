// The CV tables' CHECK constraints, said in the form before the server says
// them. Each returns the first problem as a sentence, or null. Lengths are on
// the trimmed value, as the tables measure them.

import type { MonthValue } from "./cvDates";

const len = (s: string | null | undefined) => (s ?? "").trim().length;

export function checkText(label: string, value: string | null | undefined, min: number, max: number, required: boolean) {
  const n = len(value);
  if (n === 0) return required ? `Add ${label.toLowerCase()}.` : null;
  if (n < min) return `${label} needs at least ${min} characters.`;
  if (n > max) return `${label} can be at most ${max} characters.`;
  return null;
}

/** https:// only, as every CV url column requires. */
export function checkUrl(label: string, value: string | null | undefined, required: boolean) {
  const v = (value ?? "").trim();
  if (!v) return required ? `Add ${label.toLowerCase()}.` : null;
  if (!/^https:\/\/[^ ]+$/.test(v)) return `${label} must start with https://`;
  if (v.length < 12) return `${label} looks too short to be a link.`;
  if (v.length > 2000) return `${label} is too long.`;
  return null;
}

export function checkRange(start: MonthValue | null, end: MonthValue | null, what = "The end date") {
  return start && end && end < start ? `${what} can't be before the start date.` : null;
}

export const firstProblem = (...problems: (string | null)[]) => problems.find(Boolean) ?? null;
