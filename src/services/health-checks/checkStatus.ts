import type { ScreeningRow } from "./screening";
import { formatShortDate } from "../../utils/date";

/**
 * HE1.8 row status, Last and Next (PB-HB-01): worked out on the device from
 * the approved catalogue (screening.ts), the user's own records and, once
 * Database stage B2 stores them, the done dates the user marks.
 *
 * STATUS WORDS ARE HELD FOR CLINICAL REVIEW (V6-09, V6-03). Until
 * STATUS_REVIEWED is true, a check with no known date shows "Not yet" in
 * grey (or "Ask your doctor" when the app cannot know), a check with a date
 * shows "Done", and nothing is red: "Up to date", "Due now", "Overdue" and
 * "Next ask now" wait for sign-off. Flip only with an APPROVAL record, as
 * services/health-metrics/clinicalCopy.ts does.
 *
 * NEXT is the last date plus the lower bound of the approved interval
 * (health-b-handover.md HE1.8 #19: "last + interval, lower bound"), shown as
 * month and year. A check done once ("once in adulthood") has no Next; a
 * check whose timing is the doctor's ("interval depends on the test",
 * "a choice to discuss") says "as advised".
 */
export const STATUS_REVIEWED = false;
export const STATUS_APPROVAL = null as null | { reviewer: string; approvedOn: string; note: string };

export type CheckStatusWord = "Up to date" | "Done" | "Due now" | "Overdue" | "Not yet" | "Ask your doctor";
export type CheckTone = "good" | "due" | "neutral";

export type CheckCadence =
  | { kind: "interval"; months: number }
  | { kind: "once" }
  | { kind: "doctor" };

/** Interval per catalogue check, from the approved frequency strings (lower bound). */
export function cadenceOf(row: Pick<ScreeningRow, "id" | "frequency">): CheckCadence {
  switch (row.id) {
    case "bp":
      return { kind: "interval", months: 12 }; // at least once a year
    case "glucose":
      return { kind: "interval", months: 36 }; // every 3 years
    case "cholesterol":
      return { kind: "interval", months: 48 }; // usually every 4–6 years
    case "mammogram":
      return { kind: "interval", months: 24 }; // every 2 years
    case "cervical":
      return { kind: "interval", months: 36 }; // every 3 years / every 3–5 years
    case "hepatitis_c":
    case "hiv":
      return { kind: "once" }; // once in adulthood / once (more often if at higher risk)
    case "bowel":
    case "psa":
      return { kind: "doctor" }; // depends on the test / a choice to discuss
    default:
      return { kind: "doctor" };
  }
}

/** Custom checks (B2): an optional interval 1–120 months, or done once. */
export function customCadence(intervalMonths: number | null): CheckCadence {
  return intervalMonths ? { kind: "interval", months: intervalMonths } : { kind: "once" };
}

function addMonths(iso: string, months: number): Date {
  const d = new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1 + months, 1);
  return d;
}

function monthYear(d: Date): string {
  return formatShortDate(d, { month: "short", year: "numeric" });
}

/** "5 Oct 2026" */
export function shortDate(iso: string): string {
  const d = new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  return formatShortDate(d, { day: "numeric", month: "short", year: "numeric" });
}

export type CheckState = {
  word: CheckStatusWord;
  tone: CheckTone;
  /** "5 Oct 2026", "not yet", or null when the row says nothing about when. */
  last: string | null;
  /** "Oct 2027", "ask your doctor", "ask now", "as advised", or null (no Next line). */
  next: string | null;
};

/**
 * @param lastDay  yyyy-mm-dd of the newest record or done date; null = known
 *                 never done; undefined = the app holds no record of this
 *                 kind and no done date can be stored yet.
 */
export function checkState(cadence: CheckCadence, lastDay: string | null | undefined, today: string, reviewed = STATUS_REVIEWED): CheckState {
  if (lastDay === undefined) {
    // Nothing the app could know: no claim either way.
    return { word: "Ask your doctor", tone: "neutral", last: null, next: null };
  }
  if (lastDay === null) {
    if (cadence.kind === "doctor") return { word: "Ask your doctor", tone: "neutral", last: "not yet", next: "as advised" };
    if (reviewed && cadence.kind === "interval") return { word: "Due now", tone: "due", last: "not yet", next: "ask now" };
    return { word: "Not yet", tone: "neutral", last: "not yet", next: "ask your doctor" };
  }
  const last = shortDate(lastDay);
  if (cadence.kind === "once") return { word: "Done", tone: "good", last, next: null };
  if (cadence.kind === "doctor") return { word: "Done", tone: "good", last, next: "as advised" };
  const nextDate = addMonths(lastDay, cadence.months);
  const next = monthYear(nextDate);
  if (!reviewed) return { word: "Done", tone: "good", last, next };
  const now = new Date(+today.slice(0, 4), +today.slice(5, 7) - 1, 1);
  if (nextDate > now) return { word: "Up to date", tone: "good", last, next };
  if (nextDate.getTime() === now.getTime()) return { word: "Due now", tone: "due", last, next };
  return { word: "Overdue", tone: "due", last, next };
}

/** The Mark as done popup's line (HE1.8.1 #51). */
export function nextDueLine(cadence: CheckCadence): string {
  const base = "Next due works out from how often this check is done.";
  return cadence.kind === "once" ? `${base} This one isn't repeated.` : base;
}
