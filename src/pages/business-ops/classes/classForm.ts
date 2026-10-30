import type { BusinessClassRow } from "../../../services/business-classes";
import { isoWeekday, type ClassLevel, type RepeatRule } from "../../../services/business-classes/scheduleRules";

// The class sheet's form values (strings as typed), and how a stored row and
// "Create another" fill them.

/**
 * The Repeat menu's choices (AN3-041 row 3). "Monthly" is not offered: a
 * series repeats by weekday every 1 to 4 weeks (class_series weekdays /
 * interval_weeks), and "the same date each month" has no rule there.
 */
export type RepeatKind = "none" | "daily" | "weekly" | "biweekly" | "custom";
export type RepeatEnds = "never" | "date" | "count";

export interface RepeatForm {
  kind: RepeatKind;
  /** ISO weekdays, 1 = Monday (the "On" chips). */
  weekdays: number[];
  /** Custom's "Every {n} weeks", 1 to 4. */
  interval: number;
  ends: RepeatEnds;
  /** YYYY-MM-DD for "On a date". */
  until: string;
  /** What is typed for "After {n} sessions". */
  count: string;
}

export interface ClassForm {
  classType: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  /** What is typed in the capacity box (validated on save). */
  capacity: string;
  price: string;
  professionalId: string;
  paymentType: string;
  notes: string;
  /** B9 CL-01 (create only). */
  repeat: RepeatForm;
  /** B9 EX-01 details shown on the class page. */
  about: string;
  /** Round E: "Playlist (optional)", shown on the class page. */
  playlistUrl: string;
  level: ClassLevel | "";
  bring: string[];
  coverUrl: string;
  /** B13 MK-04 centium_spots: null = "All free spots" (no separate limit), else 0 to capacity. */
  centiumSpots: number | null;
  /** B13 MK-04 listed_on_explore: false = "Members only". */
  listedOnExplore: boolean;
}

export const noRepeat = (date: string): RepeatForm => ({ kind: "none", weekdays: date ? [isoWeekday(date)] : [], interval: 2, ends: "never", until: "", count: "10" });

/** A blank form (AN3-010: 9:00 to 10:00 AM, 10 spots, cash), with any carried values. */
export const blankForm = (date: string, carry?: Partial<ClassForm>): ClassForm => ({
  classType: "",
  title: "",
  date,
  startTime: "09:00",
  endTime: "10:00",
  capacity: "10",
  price: "",
  professionalId: "",
  paymentType: "Cash",
  notes: "",
  repeat: noRepeat(date),
  about: "",
  playlistUrl: "",
  level: "",
  bring: [],
  coverUrl: "",
  centiumSpots: null,
  listedOnExplore: true,
  ...carry,
});

/** A stored session as form values (Edit class, OURS-AN3 A3). */
export const formOf = (row: BusinessClassRow): ClassForm => ({
  classType: row.classType,
  title: row.title,
  date: row.date,
  startTime: row.startTime,
  endTime: row.endTime,
  capacity: String(row.maxCapacity),
  price: row.price ? row.price.replace(/^\$/, "") : "",
  professionalId: row.professionalId ?? "",
  paymentType: "Cash",
  notes: row.notes ?? "",
  repeat: noRepeat(row.date),
  about: row.about ?? "",
  playlistUrl: row.playlistUrl ?? "",
  level: row.level ?? "",
  bring: row.whatToBring ?? [],
  coverUrl: row.coverUrl ?? "",
  centiumSpots: row.centiumSpots ?? null,
  listedOnExplore: row.listedOnExplore !== false,
});

/** V6-164: "Create another" carries type, date, Run by and payment. */
export const carryOf = (f: ClassForm): Partial<ClassForm> => ({
  classType: f.classType,
  date: f.date,
  professionalId: f.professionalId,
  paymentType: f.paymentType,
});

/** "15", "15.50", "15,50" (one comma read as the decimal point, AN3-064 row 8), "$15"; null when not a price. */
export function normalisePrice(raw: string): string | null {
  const t = raw.trim().replace(/^\$/, "").trim();
  if (!t) return "";
  if (/^\d+([.,]\d{1,2})?$/.test(t)) return t.replace(",", ".");
  return null;
}

/**
 * The series rule a filled Repeat panel asks for, or null for "Does not
 * repeat" (AN3-041 row 4: Daily = every day from the date; Weekly = the "On"
 * days; Every 2 weeks = Custom at 2; Custom = every N weeks on the days).
 */
export function ruleOf(f: Pick<ClassForm, "date" | "repeat">): RepeatRule | null {
  const r = f.repeat;
  if (r.kind === "none") return null;
  const weekdays = r.kind === "daily" ? [1, 2, 3, 4, 5, 6, 7] : [...new Set(r.weekdays)].sort((a, b) => a - b);
  const intervalWeeks = r.kind === "biweekly" ? 2 : r.kind === "custom" ? Math.min(4, Math.max(1, r.interval)) : 1;
  const count = r.ends === "count" && /^\d+$/.test(r.count.trim()) ? Number(r.count.trim()) : null;
  return { weekdays, intervalWeeks, startsOn: f.date, untilOn: r.ends === "date" && r.until ? r.until : null, count };
}

/** The Repeat panel's own problem, or null (OURS strings: no frame draws these errors). */
export function repeatProblem(f: Pick<ClassForm, "date" | "repeat">): string | null {
  const r = f.repeat;
  if (r.kind === "none") return null;
  if (r.kind !== "daily" && r.weekdays.length === 0) return "Pick at least one day.";
  if (r.ends === "date" && (!r.until || r.until < f.date)) return "Pick an end date on or after the first class.";
  if (r.ends === "count") {
    const t = r.count.trim();
    if (!/^\d+$/.test(t) || Number(t) < 1 || Number(t) > 200) return "Enter a number of sessions from 1 to 200.";
  }
  return null;
}
