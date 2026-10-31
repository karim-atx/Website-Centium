// The CV tables' CHECK constraints, said in the form before the server says
// them. Each returns the first problem as a sentence, or null. Lengths are on
// the trimmed value, as the tables measure them.
//
// Round F: the sentence is built in the chosen language when the check runs
// (on input, so during use). `label` is the field's English name, as the
// forms pass it ("Headline", "Credential link"), and is translated with it.

import type { MonthValue } from "./cvDates";
import { t, tn } from "../../i18n/core";

const len = (s: string | null | undefined) => (s ?? "").trim().length;

export function checkText(label: string, value: string | null | undefined, min: number, max: number, required: boolean) {
  const n = len(value);
  const name = t(label);
  if (n === 0) return required ? t("Add {label}.", { label: name.toLowerCase() }) : null;
  if (n < min) return tn(min, "{label} needs at least {n} character.", "{label} needs at least {n} characters.", { label: name });
  if (n > max) return tn(max, "{label} can be at most {n} character.", "{label} can be at most {n} characters.", { label: name });
  return null;
}

/** https:// only, as every CV url column requires. */
export function checkUrl(label: string, value: string | null | undefined, required: boolean) {
  const v = (value ?? "").trim();
  const name = t(label);
  if (!v) return required ? t("Add {label}.", { label: name.toLowerCase() }) : null;
  if (!/^https:\/\/[^ ]+$/.test(v)) return t("{label} must start with https://", { label: name });
  if (v.length < 12) return t("{label} looks too short to be a link.", { label: name });
  if (v.length > 2000) return t("{label} is too long.", { label: name });
  return null;
}

export function checkRange(start: MonthValue | null, end: MonthValue | null, what = "The end date") {
  return start && end && end < start ? t("{what} can't be before the start date.", { what: t(what) }) : null;
}

export const firstProblem = (...problems: (string | null)[]) => problems.find(Boolean) ?? null;
