import type { Enums } from "../../../lib/supabase/database.types";

// Where a contraceptive method is in its schedule.
//
// PURE, so every method's arithmetic can be checked without a database — and
// worth checking, because `contraception_plans_schedule_shape_check` enforces
// a DIFFERENT SET OF COLUMNS PER METHOD and getting one wrong is a constraint
// violation rather than a wrong answer.
//
// THE DATABASE ANSWERS, AND THIS MODULE DOES NOT SECOND IT.
// `my_contraception_status()` gives the pack day, the pack phase, whether a
// pill is logged today and what comes next, on the user's OWN date —
// Database-Atraxia 20260925010000 replaced `current_date` with
// `cycle_today(user)`, which resolves cycle_settings.timezone. That was the
// last reason this module carried a second opinion, and the second opinion is
// gone with it.
//
// WHAT WENT WITH IT: nextEvent(), which recomputed every countdown the
// function already returns, and the statusDate()/statusIsCurrent() pair that
// existed only to decide which of the two to believe. A countdown computed
// twice is a countdown that can disagree, and the reconciliation was scaffold
// around a hole the database has now filled.
//
// WHAT IS LEFT IS WHAT THE FUNCTION DOES NOT RETURN:
//   packDays()   the shape of the pack — which days are active, which are
//                break, and what calendar date each one falls on. The
//                function returns the pack DAY, not the grid.
//   validatePlan(), planRow()
//                writing a plan, mirroring
//                contraception_plans_schedule_shape_check branch for branch.
//   DbStatus     the shape of the function's own row.

export type Method = Enums<"contraception_method">;
export type EventKind = Enums<"contraception_event">;

/** The methods that have a schedule at all. `none`, `condom` and `other` do not. */
export const SCHEDULED_METHODS: readonly Method[] = [
  "pill_combined",
  "pill_progestin",
  "ring",
  "patch",
  "injection",
  "implant",
  "iud_hormonal",
  "iud_copper",
];

export const isPill = (m: Method) => m === "pill_combined" || m === "pill_progestin";
export const isDevice = (m: Method) =>
  m === "implant" || m === "iud_hormonal" || m === "iud_copper";

/** Whole days from `a` to `b`, by UTC date. */
export function daysBetween(a: string, b: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86400000);
}

export function shiftDay(day: string, delta: number): string {
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1, d));
  at.setUTCDate(at.getUTCDate() + delta);
  return at.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// The pack
// ---------------------------------------------------------------------------

export type PackPhase = "active" | "break";

export interface PackDay {
  /** 1-based day within the pack. */
  day: number;
  phase: PackPhase;
  /** The calendar date this pack day falls on. */
  date: string;
}

/**
 * The current pack, day by day.
 *
 * REPEATS FROM pack_start_date, so a pack started three months ago still
 * resolves — the cycle is (active_days + break_days) long and the position is
 * the elapsed days modulo that. A negative modulo is normalised, because a
 * date before the pack started is a real thing to ask about when scrubbing.
 */
export function packDays(
  plan: { packStartDate: string; activeDays: number; breakDays: number },
  on: string
): { days: PackDay[]; currentDay: number; phase: PackPhase } | null {
  const length = plan.activeDays + plan.breakDays;
  if (length <= 0) return null;

  const elapsed = daysBetween(plan.packStartDate, on);
  const index = ((elapsed % length) + length) % length;
  // The first day of the pack this `on` falls in.
  const packStart = shiftDay(on, -index);

  const days: PackDay[] = Array.from({ length }, (_, i) => ({
    day: i + 1,
    phase: i < plan.activeDays ? "active" : "break",
    date: shiftDay(packStart, i),
  }));

  return { days, currentDay: index + 1, phase: days[index].phase };
}

// ---------------------------------------------------------------------------
// The shape my_contraception_status() answers in
// ---------------------------------------------------------------------------

/** One row of my_contraception_status(), in this app's shape. */
export interface DbStatus {
  method: Method;
  packDay: number | null;
  packPhase: string | null;
  pillTakenToday: boolean;
  nextEventKind: string | null;
  nextEventOn: string | null;
  daysUntil: number | null;
}

// ---------------------------------------------------------------------------
// Writing a plan
// ---------------------------------------------------------------------------

/**
 * A plan, in the app's shape — every method's columns in one optional set.
 *
 * ONE TYPE RATHER THAN A UNION PER METHOD, because the edit sheet holds a
 * draft that is mid-change between two of them: picking "ring" while a pill's
 * pack fields are still in state is the ordinary case, not an invalid one.
 * validatePlan() and planRow() are what narrow it, and they narrow it the way
 * the CHECK constraint does.
 */
export interface PlanShape {
  method: Method;
  startedOn: string;
  packStartDate?: string | null;
  activeDays?: number | null;
  breakDays?: number | null;
  insertedOn?: string | null;
  weeksIn?: number | null;
  weeksOut?: number | null;
  firstAppliedOn?: string | null;
  changeWeekday?: number | null;
  patchFreeWeek?: boolean | null;
  lastGivenOn?: string | null;
  intervalWeeks?: number | null;
  replaceBy?: string | null;
  reminderTime?: string | null;
}

/**
 * Validates a plan against `contraception_plans_schedule_shape_check`.
 *
 * MIRRORS THE CONSTRAINT BRANCH FOR BRANCH. The constraint does not merely
 * require the right columns — it requires every OTHER method's columns to be
 * null, so a plan edited from pill to ring while keeping its pack fields is
 * refused. Building the row from scratch per method is the only shape that
 * cannot trip it.
 */
export function validatePlan(plan: PlanShape): string | null {
  const { method } = plan;

  if (isPill(method)) {
    if (!plan.packStartDate) return "Enter the date you started this pack.";
    if (plan.activeDays == null || plan.activeDays < 20 || plan.activeDays > 28) {
      return "Active days should be between 20 and 28.";
    }
    if (plan.breakDays == null || plan.breakDays < 0 || plan.breakDays > 7) {
      return "Break days should be between 0 and 7.";
    }
    const total = plan.activeDays + plan.breakDays;
    if (total < 21 || total > 35) return "A pack should be between 21 and 35 days in total.";
    return null;
  }
  if (method === "ring") {
    if (!plan.insertedOn) return "Enter the date the ring went in.";
    if (plan.weeksIn == null || plan.weeksIn < 1 || plan.weeksIn > 4) {
      return "Weeks in should be between 1 and 4.";
    }
    if (plan.weeksOut == null || plan.weeksOut < 0 || plan.weeksOut > 2) {
      return "Weeks out should be between 0 and 2.";
    }
    return null;
  }
  if (method === "patch") {
    if (!plan.firstAppliedOn) return "Enter the date you put the first patch on.";
    if (plan.changeWeekday == null || plan.changeWeekday < 0 || plan.changeWeekday > 6) {
      return "Choose the day of the week you change it.";
    }
    return null;
  }
  if (method === "injection") {
    if (!plan.lastGivenOn) return "Enter the date of your last injection.";
    if (plan.intervalWeeks == null || plan.intervalWeeks < 4 || plan.intervalWeeks > 16) {
      return "The interval should be between 4 and 16 weeks.";
    }
    return null;
  }
  if (isDevice(method)) {
    if (!plan.insertedOn) return "Enter the date it was fitted.";
    if (!plan.replaceBy) return "Enter the date it should be replaced by.";
    if (plan.replaceBy <= plan.insertedOn) return "The replace-by date must be after it was fitted.";
    return null;
  }
  return null;
}

/**
 * The row to write, built from scratch for the method.
 *
 * EVERY OTHER METHOD'S COLUMNS ARE EXPLICITLY NULL, because the CHECK requires
 * it: switching from pill to ring while leaving `active_days` set is refused,
 * and the failure would arrive as a constraint violation rather than anything
 * the user could act on.
 */
export function planRow(plan: PlanShape): Record<string, unknown> {
  const base: Record<string, unknown> = {
    method: plan.method,
    started_on: plan.startedOn,
    active_days: null,
    break_days: null,
    pack_start_date: null,
    reminder_time: null,
    inserted_on: null,
    weeks_in: null,
    weeks_out: null,
    replace_by: null,
    first_applied_on: null,
    change_weekday: null,
    patch_free_week: null,
    last_given_on: null,
    interval_weeks: null,
  };

  if (isPill(plan.method)) {
    base.active_days = plan.activeDays;
    base.break_days = plan.breakDays;
    base.pack_start_date = plan.packStartDate;
    base.reminder_time = plan.reminderTime ?? null;
  } else if (plan.method === "ring") {
    base.inserted_on = plan.insertedOn;
    base.weeks_in = plan.weeksIn;
    base.weeks_out = plan.weeksOut;
  } else if (plan.method === "patch") {
    base.first_applied_on = plan.firstAppliedOn;
    base.change_weekday = plan.changeWeekday;
    base.patch_free_week = plan.patchFreeWeek ?? false;
  } else if (plan.method === "injection") {
    base.last_given_on = plan.lastGivenOn;
    base.interval_weeks = plan.intervalWeeks;
  } else if (isDevice(plan.method)) {
    base.inserted_on = plan.insertedOn;
    base.replace_by = plan.replaceBy;
  }

  return base;
}
