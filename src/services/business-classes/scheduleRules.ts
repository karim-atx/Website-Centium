// B9 · Classes and schedule (Database 20261121230000 / 20261121240000): the
// pure half of the business side. The words a repeat rule, a refusal and a
// result read as, and the dates a rule makes, so node --test can load them
// without the Supabase client. The calls themselves are in ./schedule.ts.

import { time12 } from "../../utils/time12";
import { DAY_SHORT } from "../../utils/week";
import { HIRING_ERROR_TEXT } from "../hiring/model";
import { getLanguage, t, tn } from "../../i18n/core";
import { ARABIC_LOCALE } from "../../i18n/format";

// ---------------------------------------------------------------------------
// Refusals

/** A Postgres / PostgREST error as the services see it. */
export interface DbError {
  code?: string | null;
  message?: string | null;
}

export type ScheduleAction = "save" | "edit" | "move" | "assign" | "cancel" | "end" | "delete" | "free" | "conflicts" | "policy";

/** What each B9 refusal means, by code (HANDOVER_API B9 "New error codes", plus the ones its calls raise). */
export type ScheduleRefusal =
  | "busy" // ATXD9 the instructor is already teaching then (any business)
  | "cancelled" // ATXE0 the class was cancelled
  | "booked" // ATXE1 a class with bookings can't be deleted
  | "started" // ATX86 the class has started
  | "not_team" // ATX76 not on the Team (Database #38 business_team_professional: an accepted, unrevoked professional)
  | "capacity" // ATX13 capacity under the booked count
  | "denied" // ATX03 / 42501 no schedule permission
  | "gone" // ATX08 no such class / series / business
  | "invalid" // 22023 / 23514 a field the server refused
  | "network";

export function refusalOf(error: DbError | null | undefined): ScheduleRefusal {
  const code = error?.code ?? "";
  if (code === "ATXD9") return "busy";
  if (code === "ATXE0") return "cancelled";
  if (code === "ATXE1") return "booked";
  if (code === "ATX86") return "started";
  if (code === "ATX76") return "not_team";
  if (code === "ATX13") return "capacity";
  if (code === "ATX03" || code === "42501") return "denied";
  if (code === "ATX08" || code === "PGRST116") return "gone";
  if (code === "22023" || code === "23514" || code === "22P02" || code === "22007" || code === "22008") return "invalid";
  return "network";
}

/**
 * The date an ATXD9 names ("that instructor is already teaching at that time
 * (2026-10-21)"), as "Wed 21 Oct", or null. The server never says where.
 */
export function busyDateOf(message: string | null | undefined): string | null {
  const m = /\((\d{4}-\d{2}-\d{2})\)/.exec(message ?? "");
  return m ? shortDay(m[1]) : null;
}

/**
 * One line per refusal, per action. OURS (no frame draws the server's
 * refusals): the B9 code meanings in the app's plain voice.
 */
export function refusalMessage(action: ScheduleAction, error: DbError | null | undefined, people: "clients" | "members" = "members"): string {
  const r = refusalOf(error);
  switch (r) {
    case "busy": {
      const on = busyDateOf(error?.message);
      return on ? t("That instructor is already teaching at that time on {day}. Choose someone else or another time.", { day: on }) : t("That instructor is already teaching at that time. Choose someone else or another time.");
    }
    case "cancelled":
      return t("This class was cancelled, so it can't be changed.");
    case "booked":
      return people === "clients"
        ? t("Someone has booked this class, so it can't be deleted. Cancel it instead and the booked clients are told.")
        : t("Someone has booked this class, so it can't be deleted. Cancel it instead and the booked members are told.");
    case "started":
      return t("This class has already started.");
    case "not_team":
      // Database #38: save_class_series, edit_class, assign_class_instructor and the
      // business_classes trigger name only a Team professional (ATX76). The B-MA.6 note's words.
      return HIRING_ERROR_TEXT.instructor_not_on_team;
    case "capacity":
      return error?.message || t("Capacity can't go below the number already booked.");
    case "denied":
      return t("Your role can't change the schedule. Ask the business owner.");
    case "gone":
      return t("This class isn't on your schedule any more.");
    case "invalid":
      return action === "move" ? t("Pick a time from now on, with the end after the start.") : t("Something in this class can't be saved. Check the fields and try again.");
    default:
      break;
  }
  switch (action) {
    case "cancel":
      return t("Couldn't cancel the session. Check your connection and try again.");
    case "move":
      return t("Couldn't move the class. Check your connection and try again.");
    case "assign":
      return t("Couldn't assign. Check your connection and try again.");
    case "end":
      return t("Couldn't stop the repeat. Check your connection and try again.");
    case "delete":
      return t("Couldn't delete the class. Check your connection and try again.");
    case "policy":
      return t("Couldn't save. Try again.");
    case "free":
      return t("Couldn't check who's free. Check your connection and try again.");
    case "conflicts":
      return t("Couldn't check for clashes. Check your connection and try again.");
    case "edit":
      return t("Couldn't save your changes. Check your connection and tap Retry. Everything you entered is kept.");
    default:
      return t("Couldn't save the class. Check your connection and tap Retry. Everything you entered is kept.");
  }
}

// ---------------------------------------------------------------------------
// Dates

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const at = (iso: string) => new Date(`${iso}T00:00:00`);
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plus = (iso: string, n: number) => {
  const d = at(iso);
  d.setDate(d.getDate() + n);
  return isoOf(d);
};

/** ISO weekday, 1 = Monday … 7 = Sunday (save_class_series's numbering). */
export function isoWeekday(day: string): number {
  return ((at(day).getDay() + 6) % 7) + 1;
}

/** "Wed, Oct 7" (in Arabic, the weekday and month names in Arabic). */
export function shortDay(day: string): string {
  const d = at(day);
  if (getLanguage() === "ar") return d.toLocaleDateString(ARABIC_LOCALE, { weekday: "short", day: "numeric", month: "short" });
  return `${DAY_SHORT[isoWeekday(day) - 1]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Nov 30" (the series toast's "until {Mon D}"). */
export function dayMonth(day: string): string {
  const d = at(day);
  if (getLanguage() === "ar") return d.toLocaleDateString(ARABIC_LOCALE, { day: "numeric", month: "short" });
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "30/11/2026" (the Ends "On a date" field, AN3-045 row 4). */
export function slashDate(day: string): string {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

export interface RepeatRule {
  /** ISO weekdays, 1 = Monday. */
  weekdays: number[];
  /** 1 to 4 (class_series_interval_ok). */
  intervalWeeks: number;
  /** YYYY-MM-DD, the first possible date. */
  startsOn: string;
  /** YYYY-MM-DD, the last possible date, or null. */
  untilOn: string | null;
  /** Ends after this many classes, or null. */
  count: number | null;
}

/**
 * The dates a rule makes, the way class_series_dates() counts them: every
 * listed weekday from startsOn, in weeks counted from the Monday of startsOn's
 * week, every intervalWeeks-th week, up to untilOn, at most `count`. `limit`
 * stops early (the "Next:" line wants 3).
 */
export function seriesDates(rule: RepeatRule, limit: number, horizonDays = 366): string[] {
  const days = new Set(rule.weekdays);
  if (days.size === 0 || !rule.startsOn) return [];
  const monday = plus(rule.startsOn, -(isoWeekday(rule.startsOn) - 1));
  const interval = Math.max(1, rule.intervalWeeks || 1);
  const out: string[] = [];
  const max = Math.min(limit, rule.count ?? Infinity);
  for (let i = 0; i <= horizonDays && out.length < max; i++) {
    const d = plus(rule.startsOn, i);
    if (rule.untilOn && d > rule.untilOn) break;
    if (!days.has(isoWeekday(d))) continue;
    const weeks = Math.floor((at(d).getTime() - at(monday).getTime()) / (7 * 86_400_000) + 1e-9);
    if (weeks % interval !== 0) continue;
    out.push(d);
  }
  return out;
}

const sortDays = (ws: number[]) => [...new Set(ws)].filter((w) => w >= 1 && w <= 7).sort((a, b) => a - b);
const and = (items: string[]) => {
  if (items.length <= 1) return items.join("");
  if (getLanguage() === "en") return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
  return t("{a} and {b}", { a: items.slice(0, -1).join("، "), b: items[items.length - 1] });
};
/** A short weekday name in the app's language ("Tue", «الثلاثاء»). */
const dayShort = (w: number) => t(DAY_SHORT[w - 1]);
/** ", " in English, "، " in Arabic. */
const comma = () => (getLanguage() === "en" ? ", " : "، ");

/** "Tue and Thu", "Mon, Wed and Fri" (AN3-043 row 7). */
export function daysText(weekdays: number[]): string {
  return and(sortDays(weekdays).map(dayShort));
}

/**
 * The summary box's first line (AN3-043 / 045 / 047 / 048 row 7 / 5 / 3 / 5):
 * "Every Tue and Thu at 7:00 AM", "…, until 30 Nov", "…, 10 sessions",
 * "Every 2 weeks on Tue at 7:00 AM, 6 sessions". Seven days read "Every day"
 * (OURS: Daily's summary is not drawn).
 */
export function repeatSummary(rule: Pick<RepeatRule, "weekdays" | "intervalWeeks" | "untilOn" | "count">, startTime: string): string {
  const ws = sortDays(rule.weekdays);
  const timeText = time12(startTime);
  const every =
    rule.intervalWeeks > 1
      ? t("Every {n} weeks on {days}", { n: rule.intervalWeeks, days: daysText(ws) })
      : ws.length === 7
        ? t("Every day")
        : t("Every {days}", { days: daysText(ws) });
  const end = rule.untilOn ? t(", until {date}", { date: dayMonth(rule.untilOn) }) : rule.count ? tn(rule.count, ", {n} session", ", {n} sessions") : "";
  return `${t("{every} at {time}", { every, time: timeText })}${end}`;
}

/** "Next: Tue 7 Oct · Thu 9 Oct · Tue 14 Oct" without the "Next: " (AN3-043 row 7). */
export function nextLine(rule: RepeatRule): string {
  return seriesDates(rule, 3).map(shortDay).join(" · ");
}

/**
 * The session page's repeat line (OP1-083 row 6, 12-hour, DECIDED): "Every
 * Mon, Tue, Wed, Thu, Fri at 6:00 PM"; every N weeks "Every 2 weeks on Tue at
 * 7:00 AM" (OURS); an end "…, until 30 Nov" (OURS).
 */
export function repeatLine(rule: Pick<RepeatRule, "weekdays" | "intervalWeeks" | "untilOn">, startTime: string): string {
  const ws = sortDays(rule.weekdays).map(dayShort).join(comma());
  const head = rule.intervalWeeks > 1 ? t("Every {n} weeks on {days}", { n: rule.intervalWeeks, days: ws }) : t("Every {days}", { days: ws });
  return `${t("{every} at {time}", { every: head, time: time12(startTime) })}${rule.untilOn ? t(", until {date}", { date: dayMonth(rule.untilOn) }) : ""}`;
}

/**
 * The series pop-up's body (OP1-085 row 5): "This class repeats every
 * weekday at 6:00 PM." Mon to Fri read "every weekday", seven days "every
 * day" (the drawn sample is Mon to Fri), else "every Tue and Thu".
 */
export function repeatsSentence(rule: Pick<RepeatRule, "weekdays" | "intervalWeeks">, startTime: string): string {
  const ws = sortDays(rule.weekdays);
  const key = ws.join(",");
  const days = key === "1,2,3,4,5" ? t("every weekday") : ws.length === 7 ? t("every day") : t("every {days}", { days: daysText(ws) });
  const every = rule.intervalWeeks > 1 ? t("every {n} weeks on {days}", { n: rule.intervalWeeks, days: daysText(ws) }) : days;
  return t("This class repeats {every} at {time}.", { every, time: time12(startTime) });
}

/**
 * The toast after a series is saved (AN3-055 row 4, O1 to O3):
 * "{n} sessions created, every {days} until {D Mon}"; after N: "{n} sessions
 * created, every {days}"; never: "Weekly class created: every {days} from
 * {Ddd D Mon}"; every N weeks: "{n} sessions created, every {N} weeks on
 * {days} until {D Mon}" (or without "until" for after N).
 */
export function seriesToast(rule: RepeatRule, created: number): string {
  const ws = daysText(rule.weekdays);
  const every = rule.intervalWeeks > 1 ? t("every {n} weeks on {days}", { n: rule.intervalWeeks, days: ws }) : t("every {days}", { days: ws });
  if (!rule.untilOn && !rule.count) {
    return rule.intervalWeeks > 1
      ? t("Class created: {every} from {date}", { every, date: shortDay(rule.startsOn) })
      : t("Weekly class created: {every} from {date}", { every, date: shortDay(rule.startsOn) });
  }
  return rule.untilOn
    ? tn(created, "{n} session created, {every} until {date}", "{n} sessions created, {every} until {date}", { every, date: dayMonth(rule.untilOn) })
    : tn(created, "{n} session created, {every}", "{n} sessions created, {every}", { every });
}

// ---------------------------------------------------------------------------
// Cancel, assign, move results (OP1-086 / 087 / 073, OURS-AN3 C)

/**
 * The cancel confirm's body (OURS-AN3 C5): "{n} booked {people} get a message
 * and their bookings are released." / "Nobody has booked yet."; "+ {n} on the
 * waitlist are told too." when any; "Paid bookings stay paid. Record any
 * refund in Revenue." when any is paid (OURS: cancel_class_session never
 * refunds on its own).
 */
export function cancelBody(booked: number, waitlist: number, paid: number, people: "clients" | "members"): string {
  const bookedLine =
    people === "clients"
      ? tn(booked, "{n} booked client gets a message and their bookings are released.", "{n} booked clients get a message and their bookings are released.")
      : tn(booked, "{n} booked member gets a message and their bookings are released.", "{n} booked members get a message and their bookings are released.");
  const parts = [booked > 0 ? bookedLine : t("Nobody has booked yet.")];
  if (waitlist > 0) parts.push(tn(waitlist, "{n} on the waitlist is told too.", "{n} on the waitlist are told too."));
  if (paid > 0) parts.push(tn(paid, "{n} paid booking stays paid. Record any refund in Revenue.", "{n} paid bookings stay paid. Record any refund in Revenue."));
  return parts.join(" ");
}

/** OP1-087 / OURS-AN3 C9: "{class} {day} is cancelled. {n} {people} were told." / "{class} {day} is cancelled." */
export function cancelledToast(title: string, dayWords: string, told: number, people: "clients" | "members"): string {
  const head = t("{class} {when} is cancelled.", { class: title, when: dayWords });
  return `${head}${toldTail(told, people)}`;
}

/** " {n} {people} were told." or "" (OP1-073 T4, AN5-038 O4: only when the notice went out). */
export function toldTail(told: number, people: "clients" | "members"): string {
  if (told <= 0) return "";
  return ` ${people === "clients" ? tn(told, "{n} client was told.", "{n} clients were told.") : tn(told, "{n} member was told.", "{n} members were told.")}`;
}

// ---------------------------------------------------------------------------
// Booking rules (CL-05, business_booking_policies)

export interface BookingPolicy {
  id: string;
  /** null = the business default. */
  classType: string | null;
  cancellationHours: number | null;
  bookingWindowDays: number | null;
  closesMinutesBefore: number | null;
  defaultCapacity: number | null;
  waitlistCap: number | null;
}

export type PolicyField = "cancellationHours" | "bookingWindowDays" | "closesMinutesBefore" | "defaultCapacity" | "waitlistCap";

/** The table's CHECK ranges, so a picker never offers what the server refuses. */
export const POLICY_RANGE: Record<PolicyField, [number, number]> = {
  cancellationHours: [0, 168],
  bookingWindowDays: [1, 90],
  closesMinutesBefore: [0, 1440],
  defaultCapacity: [1, 200],
  waitlistCap: [0, 100],
};

/** The values class_booking_rules() falls back to (HANDOVER_API B9 precedence table). */
export const POLICY_FALLBACK = { cancellationHours: 12, bookingWindowDays: 14, closesMinutesBefore: 30, waitlistCap: 5 } as const;

/** The row for a class type, matched case-insensitively and trimmed (business_booking_policies_one_per_type). */
export function policyFor(policies: BookingPolicy[], classType: string | null): BookingPolicy | null {
  const key = (classType ?? "").trim().toLowerCase();
  return policies.find((p) => (p.classType ?? "").trim().toLowerCase() === key) ?? null;
}

/**
 * What a class type actually gets, field by field: its own row, else the
 * business default, else (cancellation) the venue's value, else the fallback.
 */
export function effectiveRules(policies: BookingPolicy[], classType: string | null, venueHours: number | null) {
  const own = classType ? policyFor(policies, classType) : null;
  const def = policyFor(policies, null);
  const pick = (f: PolicyField) => own?.[f] ?? def?.[f] ?? null;
  return {
    cancellationHours: pick("cancellationHours") ?? venueHours ?? POLICY_FALLBACK.cancellationHours,
    bookingWindowDays: pick("bookingWindowDays") ?? POLICY_FALLBACK.bookingWindowDays,
    closesMinutesBefore: pick("closesMinutesBefore") ?? POLICY_FALLBACK.closesMinutesBefore,
    waitlistCap: pick("waitlistCap") ?? POLICY_FALLBACK.waitlistCap,
    defaultCapacity: pick("defaultCapacity"),
  };
}

/** A whole number inside the field's CHECK range, or null. */
export function policyValueOk(field: PolicyField, v: number | null): boolean {
  if (v === null) return true;
  const [lo, hi] = POLICY_RANGE[field];
  return Number.isInteger(v) && v >= lo && v <= hi;
}

/** "12 hours before", "1 hour before", "At class time" (0). */
export function hoursBefore(h: number): string {
  if (h === 0) return t("Until class time");
  return tn(h, "{n} hour before", "{n} hours before");
}

/** "30 min before", "1 hour before", "2 hours before", "At class time". */
export function minutesBefore(m: number): string {
  if (m === 0) return t("At class time");
  if (m % 60 === 0) return tn(m / 60, "{n} hour before", "{n} hours before");
  return t("{n} min before", { n: m });
}

/** "14 days", "1 day". */
export function daysAhead(d: number): string {
  return tn(d, "{n} day", "{n} days");
}

// ---------------------------------------------------------------------------
// Class details (EX-01)

export type ClassLevel = "all_levels" | "beginner" | "intermediate" | "advanced";
export const CLASS_LEVELS: { value: ClassLevel; label: string }[] = [
  {
    value: "all_levels",
    get label() {
      return t("All levels");
    },
  },
  {
    value: "beginner",
    get label() {
      return t("Beginner");
    },
  },
  {
    value: "intermediate",
    get label() {
      return t("Intermediate");
    },
  },
  {
    value: "advanced",
    get label() {
      return t("Advanced");
    },
  },
];
export const ABOUT_MAX = 1000;
export const BRING_MAX_ITEMS = 10;
export const BRING_MAX_CHARS = 60;

/** One "what to bring" list from the typed items: trimmed, no blanks or repeats, at most 10 of 60 characters. */
export function bringList(items: string[]): string[] {
  const out: string[] = [];
  for (const raw of items) {
    const t = raw.trim().slice(0, BRING_MAX_CHARS);
    if (t && !out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
    if (out.length >= BRING_MAX_ITEMS) break;
  }
  return out;
}
