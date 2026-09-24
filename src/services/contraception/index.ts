import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { planRow, validatePlan, type EventKind, type Method, type PlanShape } from "./schedule";

export * from "./schedule";

// Contraception plans and the events logged against them.
//
// NO UPSERTS. `id`, `created_at` and `user_id` are INSERT-only grants on both
// tables, and an upsert writes the whole payload down its UPDATE branch — the
// 42501 that part 1 shipped on cycle_day_logs. Every write here is an explicit
// INSERT or an explicit UPDATE.
//
// TODAY'S ANSWER COMES FROM ./schedule.ts, NOT FROM THE DATABASE, and that is
// the opposite of how services/cycle works. `my_contraception_status()`
// computes from Postgres's `current_date` and never reads
// cycle_settings.timezone, so away from UTC it answers about a different day
// than the user is in. The full argument, with the two things it got visibly
// wrong, is on getStatus below.

export interface ContraceptionPlan extends PlanShape {
  id: string;
  endedOn: string | null;
}

export interface ContraceptionEvent {
  id: string;
  event: EventKind;
  occurredOn: string;
  occurredAt: string | null;
  notes: string | null;
}

/** One row of my_contraception_status(), or nothing. */
export interface ContraceptionStatus {
  method: Method;
  packDay: number | null;
  packPhase: string | null;
  pillTakenToday: boolean;
  nextEventKind: string | null;
  nextEventOn: string | null;
  daysUntil: number | null;
}

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };
export type WriteResult = { ok: true } | { ok: false; message: string };

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to save this.";
  }
  // contraception_events_one_pill_per_day_idx: one pill outcome per day, so a
  // second tap is an edit rather than a second row.
  if (code === "23505") return "Today is already logged. Change it instead of adding another.";
  if (code === "23514") return "That schedule doesn't fit this method — check the dates and numbers.";
  if (code === "42501") {
    return "You don't have permission to save this. Sign in again and try once more.";
  }
  return "Couldn't save that. Check your connection and try again.";
}

const PLAN_COLUMNS =
  "id, method, started_on, ended_on, pack_start_date, active_days, break_days, reminder_time, inserted_on, weeks_in, weeks_out, replace_by, first_applied_on, change_weekday, patch_free_week, last_given_on, interval_weeks";

function toPlan(row: Record<string, unknown>): ContraceptionPlan {
  return {
    id: row.id as string,
    method: row.method as Method,
    startedOn: row.started_on as string,
    endedOn: (row.ended_on as string | null) ?? null,
    packStartDate: (row.pack_start_date as string | null) ?? null,
    activeDays: (row.active_days as number | null) ?? null,
    breakDays: (row.break_days as number | null) ?? null,
    reminderTime: (row.reminder_time as string | null) ?? null,
    insertedOn: (row.inserted_on as string | null) ?? null,
    weeksIn: (row.weeks_in as number | null) ?? null,
    weeksOut: (row.weeks_out as number | null) ?? null,
    replaceBy: (row.replace_by as string | null) ?? null,
    firstAppliedOn: (row.first_applied_on as string | null) ?? null,
    changeWeekday: (row.change_weekday as number | null) ?? null,
    patchFreeWeek: (row.patch_free_week as boolean | null) ?? null,
    lastGivenOn: (row.last_given_on as string | null) ?? null,
    intervalWeeks: (row.interval_weeks as number | null) ?? null,
  };
}

/**
 * The plan in use, or null.
 *
 * ONE ACTIVE PLAN, which `contraception_plans_one_active_idx` enforces where
 * `ended_on IS NULL` — so switching method ends the old plan rather than
 * adding a second, and the history stays readable.
 */
export async function getActivePlan(userId: string): Promise<Result<ContraceptionPlan | null>> {
  const { data, error } = await supabase
    .from("contraception_plans")
    .select(PLAN_COLUMNS)
    .eq("user_id", userId)
    .is("ended_on", null)
    .maybeSingle();

  if (error) {
    console.error("[contraception] Could not load the plan:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true, value: data ? toPlan(data as Record<string, unknown>) : null };
}

/**
 * Starts a plan, ending whatever was in use first.
 *
 * THE END COMES FIRST AND IS CHECKED, because the partial unique index would
 * otherwise refuse the insert and the user would be told their perfectly good
 * plan is a duplicate.
 */
export async function startPlan(userId: string, plan: PlanShape): Promise<WriteResult> {
  const invalid = validatePlan(plan);
  if (invalid) return { ok: false, message: invalid };

  const existing = await getActivePlan(userId);
  if (!existing.ok) return { ok: false, message: existing.message };
  if (existing.value) {
    const ended = await endPlan(existing.value.id, plan.startedOn);
    if (!ended.ok) return ended;
  }

  // planRow() NULLS EVERY OTHER METHOD'S COLUMNS, which
  // contraception_plans_schedule_shape_check requires.
  const { error } = await supabase
    .from("contraception_plans")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ user_id: userId, ...planRow(plan) } as any);

  if (error) {
    console.error("[contraception] Could not start the plan:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

/** Edits the plan in place — a corrected pack date, a new reminder time. */
export async function updatePlan(id: string, plan: PlanShape): Promise<WriteResult> {
  const invalid = validatePlan(plan);
  if (invalid) return { ok: false, message: invalid };

  const { error } = await supabase
    .from("contraception_plans")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(planRow(plan) as any)
    .eq("id", id);

  if (error) {
    console.error("[contraception] Could not update the plan:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

export async function endPlan(id: string, endedOn: string): Promise<WriteResult> {
  const { error } = await supabase
    .from("contraception_plans")
    .update({ ended_on: endedOn })
    .eq("id", id);

  if (error) {
    console.error("[contraception] Could not end the plan:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function getEvents(
  userId: string,
  sinceDay: string
): Promise<Result<ContraceptionEvent[]>> {
  const { data, error } = await supabase
    .from("contraception_events")
    .select("id, event, occurred_on, occurred_at, notes")
    .eq("user_id", userId)
    .gte("occurred_on", sinceDay)
    .order("occurred_on", { ascending: false });

  if (error) {
    console.error("[contraception] Could not load history:", error.message);
    return { ok: false, message: describe(error) };
  }
  return {
    ok: true,
    value: (data ?? []).map((r) => ({
      id: r.id,
      event: r.event,
      occurredOn: r.occurred_on,
      occurredAt: r.occurred_at,
      notes: r.notes,
    })),
  };
}

const PILL_EVENTS: readonly EventKind[] = ["pill_taken", "pill_missed", "pill_late"];

/**
 * Logs one event.
 *
 * A PILL DAY IS ONE RECORD THAT GETS CORRECTED, not a stream: marking today
 * missed and then finding the pill replaces the row rather than adding a
 * second, which is what `contraception_events_one_pill_per_day_idx` assumes.
 * Update first, insert if it missed — never upsert, for the grant reason at
 * the top of this file.
 *
 * Everything else (a ring out, a patch on, an injection given) is a genuine
 * event and simply inserts, because two of them on one day is a real thing.
 */
export async function logEvent(
  userId: string,
  planId: string | null,
  event: EventKind,
  occurredOn: string,
  options?: { occurredAt?: string | null; notes?: string | null }
): Promise<WriteResult> {
  const row = {
    event,
    occurred_on: occurredOn,
    occurred_at: options?.occurredAt ?? null,
    notes: options?.notes?.trim() ? options.notes.trim() : null,
    plan_id: planId,
  };

  if (PILL_EVENTS.includes(event)) {
    const { data: updated, error: updateError } = await supabase
      .from("contraception_events")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(row as any)
      .eq("user_id", userId)
      .eq("occurred_on", occurredOn)
      .in("event", [...PILL_EVENTS])
      .select("id");

    if (updateError) {
      console.error("[contraception] Could not update today's pill:", updateError.message);
      return { ok: false, message: describe(updateError) };
    }
    if (updated && updated.length > 0) return { ok: true };
  }

  const { error } = await supabase
    .from("contraception_events")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ user_id: userId, ...row } as any);

  if (error) {
    console.error("[contraception] Could not log that:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

/** Removes one logged event — an undo, not a correction. */
export async function deleteEvent(id: string): Promise<WriteResult> {
  const { error } = await supabase.from("contraception_events").delete().eq("id", id);
  if (error) {
    console.error("[contraception] Could not remove that:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Today, from the database
// ---------------------------------------------------------------------------

/**
 * Where the plan stands today, according to the database.
 *
 * NO SCREEN READS THIS YET, DELIBERATELY. my_contraception_status() computes
 * from Postgres's `current_date` and does not read cycle_settings.timezone,
 * so away from UTC it answers about a different day than the one the user is
 * in — it put the pack grid's "today" ring one square off the pill that had
 * just been logged, and reported "put a new ring in tomorrow" for a ring
 * inserted the same afternoon. ./schedule.ts answers the same questions on
 * the user's own date, and is what the screens use.
 *
 * This stays because it is the answer the reminder queue acts on, and because
 * the moment the function takes a timezone the screens should go back to it —
 * one answer is better than two.
 *
 * NO ROWS MEANS NO PLAN, which is the ordinary case rather than an error.
 */
export async function getStatus(): Promise<Result<ContraceptionStatus | null>> {
  const { data, error } = await supabase.rpc("my_contraception_status");

  if (error) {
    console.error("[contraception] Could not read today's status:", error.message);
    return { ok: false, message: describe(error) };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: true, value: null };

  return {
    ok: true,
    value: {
      method: row.method,
      packDay: row.pack_day ?? null,
      packPhase: row.pack_phase ?? null,
      pillTakenToday: Boolean(row.pill_taken_today),
      nextEventKind: row.next_event_kind ?? null,
      nextEventOn: row.next_event_on ?? null,
      daysUntil: row.days_until ?? null,
    },
  };
}
