// B9 · Classes and schedule (Database 20261121230000 / 20261121240000): the
// pure half of the business side. The words a repeat rule, a refusal and a
// result read as, and the dates a rule makes, so node --test can load them
// without the Supabase client. The calls themselves are in ./schedule.ts.

import { time12 } from "../../utils/time12";
import { DAY_SHORT } from "../../utils/week";
import { HIRING_ERROR_TEXT } from "../hiring/model";

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

const CONNECTION = "Check your connection and try again.";

/**
 * One line per refusal, per action. OURS (no frame draws the server's
 * refusals): the B9 code meanings in the app's plain voice.
 */
export function refusalMessage(action: ScheduleAction, error: DbError | null | undefined, people: "clients" | "members" = "members"): string {
  const r = refusalOf(error);
  switch (r) {
    case "busy": {
      const on = busyDateOf(error?.message);
      return on ? `That instructor is already teaching at that time on ${on}. Choose someone else or another time.` : "That instructor is already teaching at that time. Choose someone else or another time.";
    }
    case "cancelled":
      return "This class was cancelled, so it can't be changed.";
    case "booked":
      return `Someone has booked this class, so it can't be deleted. Cancel it instead and the booked ${people} are told.`;
    case "started":
      return "This class has already started.";
    case "not_team":
      // Database #38: save_class_series, edit_class, assign_class_instructor and the
      // business_classes trigger name only a Team professional (ATX76). The B-MA.6 note's words.
      return HIRING_ERROR_TEXT.instructor_not_on_team;
    case "capacity":
      return error?.message || "Capacity can't go below the number already booked.";
    case "denied":
      return "Your role can't change the schedule. Ask the business owner.";
    case "gone":
      return "This class isn't on your schedule any more.";
    case "invalid":
      return action === "move" ? "Pick a time from now on, with the end after the start." : "Something in this class can't be saved. Check the fields and try again.";
    default:
      break;
  }
  switch (action) {
    case "cancel":
      return `Couldn't cancel the session. ${CONNECTION}`;
    case "move":
      return `Couldn't move the class. ${CONNECTION}`;
    case "assign":
      return `Couldn't assign. ${CONNECTION}`;
    case "end":
      return `Couldn't stop the repeat. ${CONNECTION}`;
    case "delete":
      return `Couldn't delete the class. ${CONNECTION}`;
    case "policy":
      return "Couldn't save. Try again.";
    case "free":
      return `Couldn't check who's free. ${CONNECTION}`;
    case "conflicts":
      return `Couldn't check for clashes. ${CONNECTION}`;
    case "edit":
      return "Couldn't save your changes. Check your connection and tap Retry. Everything you entered is kept.";
    default:
      return "Couldn't save the class. Check your connection and tap Retry. Everything you entered is kept.";
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

/** "Wed, Oct 7" */
export function shortDay(day: string): string {
  const d = at(day);
  return `${DAY_SHORT[isoWeekday(day) - 1]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Nov 30" (the series toast's "until {Mon D}"). */
export function dayMonth(day: string): string {
  const d = at(day);
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
const and = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

/** "Tue and Thu", "Mon, Wed and Fri" (AN3-043 row 7). */
export function daysText(weekdays: number[]): string {
  return and(sortDays(weekdays).map((w) => DAY_SHORT[w - 1]));
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
  const every = rule.intervalWeeks > 1 ? `Every ${rule.intervalWeeks} weeks on ${daysText(ws)}` : ws.length === 7 ? "Every day" : `Every ${daysText(ws)}`;
  const end = rule.untilOn ? `, until ${dayMonth(rule.untilOn)}` : rule.count ? `, ${rule.count} ${rule.count === 1 ? "session" : "sessions"}` : "";
  return `${every} at ${timeText}${end}`;
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
  const ws = sortDays(rule.weekdays).map((w) => DAY_SHORT[w - 1]);
  const head = rule.intervalWeeks > 1 ? `Every ${rule.intervalWeeks} weeks on ${ws.join(", ")}` : `Every ${ws.join(", ")}`;
  return `${head} at ${time12(startTime)}${rule.untilOn ? `, until ${dayMonth(rule.untilOn)}` : ""}`;
}

/**
 * The series pop-up's body (OP1-085 row 5): "This class repeats every
 * weekday at 6:00 PM." Mon to Fri read "every weekday", seven days "every
 * day" (the drawn sample is Mon to Fri), else "every Tue and Thu".
 */
export function repeatsSentence(rule: Pick<RepeatRule, "weekdays" | "intervalWeeks">, startTime: string): string {
  const ws = sortDays(rule.weekdays);
  const key = ws.join(",");
  const days = key === "1,2,3,4,5" ? "every weekday" : ws.length === 7 ? "every day" : `every ${daysText(ws)}`;
  const every = rule.intervalWeeks > 1 ? `every ${rule.intervalWeeks} weeks on ${daysText(ws)}` : days;
  return `This class repeats ${every} at ${time12(startTime)}.`;
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
  const every = rule.intervalWeeks > 1 ? `every ${rule.intervalWeeks} weeks on ${ws}` : `every ${ws}`;
  if (!rule.untilOn && !rule.count) {
    return rule.intervalWeeks > 1 ? `Class created: ${every} from ${shortDay(rule.startsOn)}` : `Weekly class created: ${every} from ${shortDay(rule.startsOn)}`;
  }
  const n = `${created} ${created === 1 ? "session" : "sessions"} created, ${every}`;
  return rule.untilOn ? `${n} until ${dayMonth(rule.untilOn)}` : n;
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
  const parts = [booked > 0 ? `${booked} booked ${booked === 1 ? people.slice(0, -1) : people} ${booked === 1 ? "gets" : "get"} a message and their bookings are released.` : "Nobody has booked yet."];
  if (waitlist > 0) parts.push(`${waitlist} on the waitlist ${waitlist === 1 ? "is" : "are"} told too.`);
  if (paid > 0) parts.push(`${paid} paid ${paid === 1 ? "booking stays" : "bookings stay"} paid. Record any refund in Revenue.`);
  return parts.join(" ");
}

/** OP1-087 / OURS-AN3 C9: "{class} {day} is cancelled. {n} {people} were told." / "{class} {day} is cancelled." */
export function cancelledToast(title: string, dayWords: string, told: number, people: "clients" | "members"): string {
  const head = `${title} ${dayWords} is cancelled.`;
  if (told <= 0) return head;
  return `${head} ${told} ${told === 1 ? people.slice(0, -1) : people} ${told === 1 ? "was" : "were"} told.`;
}

/** " {n} {people} were told." or "" (OP1-073 T4, AN5-038 O4: only when the notice went out). */
export function toldTail(told: number, people: "clients" | "members"): string {
  if (told <= 0) return "";
  return ` ${told} ${told === 1 ? people.slice(0, -1) : people} ${told === 1 ? "was" : "were"} told.`;
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
  if (h === 0) return "Until class time";
  return `${h} ${h === 1 ? "hour" : "hours"} before`;
}

/** "30 min before", "1 hour before", "2 hours before", "At class time". */
export function minutesBefore(m: number): string {
  if (m === 0) return "At class time";
  if (m % 60 === 0) return `${m / 60} ${m === 60 ? "hour" : "hours"} before`;
  return `${m} min before`;
}

/** "14 days", "1 day". */
export function daysAhead(d: number): string {
  return `${d} ${d === 1 ? "day" : "days"}`;
}

// ---------------------------------------------------------------------------
// Class details (EX-01)

export type ClassLevel = "all_levels" | "beginner" | "intermediate" | "advanced";
export const CLASS_LEVELS: { value: ClassLevel; label: string }[] = [
  { value: "all_levels", label: "All levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
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

/** The class-covers object path: <uploader uid>/<business_id>/<file> (HANDOVER_API B9 "Covers"). */
export function classCoverPath(uid: string, businessId: string, fileId: string): string {
  return `${uid}/${businessId}/${fileId}.jpg`;
}
