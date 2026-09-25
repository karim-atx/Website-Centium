import type { Enums } from "../../../lib/supabase/database.types";

// Where a contraceptive method is in its schedule.
//
// PURE, so every method's arithmetic can be checked without a database — and
// worth checking, because `contraception_plans_schedule_shape_check` enforces
// a DIFFERENT SET OF COLUMNS PER METHOD and getting one wrong is a constraint
// violation rather than a wrong answer.
//
// THE DATABASE ANSWERS FIRST, AND THIS MODULE CHECKS ITS WATCH.
// `my_contraception_status()` gives the pack day, the pack phase, whether a
// pill was logged today and what is next — and the screen shows exactly that,
// except when the function's idea of "today" is not the user's. It computes
// from Postgres's `current_date`, which is UTC, and does not read
// cycle_settings.timezone (the reminder queue does, via timezone(tz, now())).
// So for the hours where the two dates differ it answers about a different
// day, and that is not a rounding error:
//
//   - the pack grid put the "today" ring on day 10 while the pill just logged
//     sat on day 11, because an event is stored under the user's own date;
//   - a ring inserted that afternoon came back as "Put a new ring in — in 1
//     day", because inserted_on was in the future by the function's reckoning
//     and the modulo wrapped to the last day of the ring-free week.
//
// statusDate() below recovers the date the function used, from its own
// next_event_on and days_until. When it matches the user's, the function's
// answers are used verbatim. When it does not, nextEvent() and packDays()
// answer the same questions on the date the user is living in. Either way the
// screen shows one day, not two.

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
// Reconciling my_contraception_status() with the user's own date
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

/**
 * The date the function computed from, recovered from its own answer.
 *
 * It never returns `current_date` directly, but it returns both a date and the
 * days until it, and one minus the other is the day it was standing on. Null
 * when it gave neither — a method with no schedule, where there is nothing to
 * reconcile because there is nothing to show.
 */
export function statusDate(status: Pick<DbStatus, "nextEventOn" | "daysUntil">): string | null {
  if (!status.nextEventOn || status.daysUntil == null) return null;
  return shiftDay(status.nextEventOn, -status.daysUntil);
}

/**
 * Whether the function's answers can be shown as they are.
 *
 * NULL COUNTS AS AGREEING. A plan with no schedule gives no date to check, and
 * refusing the function's answer there would mean refusing an answer it never
 * gave. Everything that has a date is checked against the user's.
 */
export function statusIsCurrent(status: DbStatus | null, today: string): boolean {
  if (!status) return false;
  const on = statusDate(status);
  return on === null || on === today;
}

// ---------------------------------------------------------------------------
// What is next, per method
// ---------------------------------------------------------------------------

export interface NextEvent {
  kind: string;
  /** Plain words for the card. */
  label: string;
  date: string;
  daysUntil: number;
}

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
 * The next scheduled event, or null for a method that has none.
 *
 * ONE BRANCH PER SHAPE THE CHECK CONSTRAINT DEFINES, in the same order, so a
 * reader can hold this beside `contraception_plans_schedule_shape_check` and
 * see that the two agree. Anything the constraint allows to be null is
 * guarded here rather than asserted.
 */
export function nextEvent(plan: PlanShape, on: string): NextEvent | null {
  const { method } = plan;

  if (isPill(method)) {
    if (!plan.packStartDate || plan.activeDays == null || plan.breakDays == null) return null;
    if (plan.breakDays === 0) return null; // continuous pack: no break to announce
    const pack = packDays(
      { packStartDate: plan.packStartDate, activeDays: plan.activeDays, breakDays: plan.breakDays },
      on
    );
    if (!pack) return null;
    const firstBreakIndex = plan.activeDays; // 0-based
    const nextIndex = pack.currentDay - 1 < firstBreakIndex ? firstBreakIndex : pack.days.length;
    const date =
      nextIndex < pack.days.length
        ? pack.days[nextIndex].date
        : shiftDay(pack.days[pack.days.length - 1].date, 1);
    return {
      kind: nextIndex < pack.days.length ? "break_starts" : "pack_starts",
      label: nextIndex < pack.days.length ? "Break week starts" : "Next pack starts",
      date,
      daysUntil: daysBetween(on, date),
    };
  }

  if (method === "ring") {
    if (!plan.insertedOn || plan.weeksIn == null || plan.weeksOut == null) return null;
    const cycleDays = (plan.weeksIn + plan.weeksOut) * 7;
    if (cycleDays <= 0) return null;
    const elapsed = daysBetween(plan.insertedOn, on);
    const index = ((elapsed % cycleDays) + cycleDays) % cycleDays;
    const inDays = plan.weeksIn * 7;
    const date = index < inDays ? shiftDay(on, inDays - index) : shiftDay(on, cycleDays - index);
    return {
      kind: index < inDays ? "ring_removed" : "ring_inserted",
      label: index < inDays ? "Take the ring out" : "Put a new ring in",
      date,
      daysUntil: daysBetween(on, date),
    };
  }

  if (method === "patch") {
    if (!plan.firstAppliedOn || plan.changeWeekday == null) return null;
    // A patch is changed weekly; with a patch-free week, the fourth is skipped.
    const elapsed = daysBetween(plan.firstAppliedOn, on);
    const weekIndex = Math.floor(elapsed / 7);
    const cycleWeeks = plan.patchFreeWeek ? 4 : 1;
    const weekInCycle = ((weekIndex % cycleWeeks) + cycleWeeks) % cycleWeeks;
    const daysIntoWeek = ((elapsed % 7) + 7) % 7;
    const date = shiftDay(on, 7 - daysIntoWeek);
    const startingFreeWeek = plan.patchFreeWeek && weekInCycle === 2;
    const endingFreeWeek = plan.patchFreeWeek && weekInCycle === 3;
    return {
      kind: endingFreeWeek || !plan.patchFreeWeek ? "patch_applied" : startingFreeWeek ? "patch_removed" : "patch_applied",
      label: startingFreeWeek ? "Patch-free week starts" : endingFreeWeek ? "Put a new patch on" : "Change your patch",
      date,
      daysUntil: daysBetween(on, date),
    };
  }

  if (method === "injection") {
    if (!plan.lastGivenOn || plan.intervalWeeks == null) return null;
    const date = shiftDay(plan.lastGivenOn, plan.intervalWeeks * 7);
    return {
      kind: "injection_given",
      label: "Next injection due",
      date,
      daysUntil: daysBetween(on, date),
    };
  }

  if (isDevice(method)) {
    if (!plan.replaceBy) return null;
    return {
      kind: "device_removed",
      label: "Replace by",
      date: plan.replaceBy,
      daysUntil: daysBetween(on, plan.replaceBy),
    };
  }

  return null;
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
