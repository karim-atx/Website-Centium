import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Enums } from "../../../lib/supabase/database.types";
import { dueDateFromLmp, lmpFromDueDate } from "./weeks";

export * from "./weeks";

// Pregnancies, kick sessions and contractions.
//
// NO UPSERTS ANYWHERE IN THIS FILE, and that is not stylistic. On every one of
// these tables `id`, `created_at` and `user_id` are granted for INSERT and
// deliberately not for UPDATE — they identify the row. `.upsert()` compiles to
// INSERT … ON CONFLICT DO UPDATE and the UPDATE branch writes the whole
// payload, so it asks for a privilege that does not exist and comes back
// 42501. Part 1 shipped that bug on cycle_day_logs; every write below is an
// explicit INSERT or an explicit UPDATE, with user_id in the first only.

export type PregnancyStatus = Enums<"pregnancy_status">;
export type PregnancyOutcome = Enums<"pregnancy_outcome">;

export interface Pregnancy {
  id: string;
  lmpDate: string | null;
  dueDate: string | null;
  status: PregnancyStatus;
  outcome: PregnancyOutcome | null;
  endedOn: string | null;
  postpartumUntil: string | null;
}

export interface KickSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  kicks: number;
}

export interface Contraction {
  id: string;
  startedAt: string;
  endedAt: string | null;
}

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };
export type WriteResult = { ok: true } | { ok: false; message: string };

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to save this.";
  }
  if (code === "23505") return "There's already a pregnancy being tracked.";
  if (code === "23514") return "Those dates don't work together — check them and try again.";
  if (code === "42501") {
    return "You don't have permission to save this. Sign in again and try once more.";
  }
  return "Couldn't save that. Check your connection and try again.";
}

const PREGNANCY_COLUMNS = "id, lmp_date, due_date, status, outcome, ended_on, postpartum_until";

function toPregnancy(row: Record<string, unknown>): Pregnancy {
  return {
    id: row.id as string,
    lmpDate: (row.lmp_date as string | null) ?? null,
    dueDate: (row.due_date as string | null) ?? null,
    status: row.status as PregnancyStatus,
    outcome: (row.outcome as PregnancyOutcome | null) ?? null,
    endedOn: (row.ended_on as string | null) ?? null,
    postpartumUntil: (row.postpartum_until as string | null) ?? null,
  };
}

/**
 * The active pregnancy, or null.
 *
 * ONE AT A TIME, which `pregnancies_one_active_per_user_idx` enforces — so
 * this is a maybeSingle rather than a list with a pick.
 */
export async function getActivePregnancy(userId: string): Promise<Result<Pregnancy | null>> {
  const { data, error } = await supabase
    .from("pregnancies")
    .select(PREGNANCY_COLUMNS)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("[pregnancy] Could not load the pregnancy:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true, value: data ? toPregnancy(data as Record<string, unknown>) : null };
}

/**
 * The most recently ended one, for the postpartum and loss states.
 *
 * TWO KEYS, BECAUSE ended_on IS A DATE. Two pregnancies can end on the same
 * day — one ended and another started and ended after it, which is exactly
 * what a mistaken entry being corrected looks like — and with one key the
 * database is free to hand back either. It handed back the older one, so the
 * after-a-birth card did not appear. created_at breaks the tie.
 */
export async function getLatestEndedPregnancy(userId: string): Promise<Result<Pregnancy | null>> {
  const { data, error } = await supabase
    .from("pregnancies")
    .select(PREGNANCY_COLUMNS)
    .eq("user_id", userId)
    .eq("status", "ended")
    .order("ended_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[pregnancy] Could not load past pregnancies:", error.message);
    return { ok: false, message: describe(error) };
  }
  const row = data?.[0];
  return { ok: true, value: row ? toPregnancy(row as Record<string, unknown>) : null };
}

/**
 * Starts tracking, from a last period OR a due date.
 *
 * BOTH COLUMNS ARE WRITTEN whichever was given, because the database's
 * `pregnancies_basis_check` needs at least one and every screen wants both:
 * the weeks count from the LMP and the countdown runs to the due date. A
 * scan-corrected due date therefore rewrites the LMP rather than sitting
 * beside a stale one — see lmpFromDueDate.
 */
export async function startPregnancy(
  userId: string,
  basis: { lmpDate?: string; dueDate?: string }
): Promise<WriteResult> {
  const lmpDate = basis.lmpDate ?? (basis.dueDate ? lmpFromDueDate(basis.dueDate) : null);
  const dueDate = basis.dueDate ?? (basis.lmpDate ? dueDateFromLmp(basis.lmpDate) : null);
  if (!lmpDate && !dueDate) {
    return { ok: false, message: "Enter either your last period or your due date." };
  }

  const { error } = await supabase
    .from("pregnancies")
    .insert({ user_id: userId, lmp_date: lmpDate, due_date: dueDate, status: "active" });

  if (error) {
    console.error("[pregnancy] Could not start tracking:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

/**
 * Ends tracking.
 *
 * `pregnancies_ended_shape_check` requires BOTH an outcome and an ended_on the
 * moment status becomes 'ended', so all three move in one update.
 *
 * postpartum_until is set for a birth and left null otherwise. That single
 * column is what makes the difference between the two after-states: a birth
 * resumes predictions with a caution, and a loss leaves them paused until the
 * user says otherwise. Neither is inferred from the outcome anywhere else.
 */
export async function endPregnancy(
  id: string,
  outcome: PregnancyOutcome,
  endedOn: string,
  postpartumUntil: string | null
): Promise<WriteResult> {
  const { error } = await supabase
    .from("pregnancies")
    .update({
      status: "ended",
      outcome,
      ended_on: endedOn,
      postpartum_until: outcome === "birth" ? postpartumUntil : null,
    })
    .eq("id", id);

  if (error) {
    console.error("[pregnancy] Could not end tracking:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Kick sessions
// ---------------------------------------------------------------------------

export async function getKickSessions(
  userId: string,
  pregnancyId: string
): Promise<Result<KickSession[]>> {
  const { data, error } = await supabase
    .from("pregnancy_kick_sessions")
    .select("id, started_at, ended_at, kicks")
    .eq("user_id", userId)
    .eq("pregnancy_id", pregnancyId)
    .order("started_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[pregnancy] Could not load kick sessions:", error.message);
    return { ok: false, message: describe(error) };
  }
  return {
    ok: true,
    value: (data ?? []).map((r) => ({
      id: r.id,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      kicks: r.kicks,
    })),
  };
}

export async function startKickSession(
  userId: string,
  pregnancyId: string,
  startedAt: string
): Promise<Result<string>> {
  const { data, error } = await supabase
    .from("pregnancy_kick_sessions")
    .insert({ user_id: userId, pregnancy_id: pregnancyId, started_at: startedAt, kicks: 0 })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[pregnancy] Could not start a kick session:", error?.message);
    return { ok: false, message: error ? describe(error) : "Couldn't start counting." };
  }
  return { ok: true, value: data.id };
}

/** Updates the running count, and optionally closes the session. */
export async function saveKickSession(
  id: string,
  kicks: number,
  endedAt: string | null
): Promise<WriteResult> {
  const patch: Record<string, unknown> = { kicks: Math.max(0, Math.min(1000, Math.round(kicks))) };
  if (endedAt) patch.ended_at = endedAt;

  const { error } = await supabase
    .from("pregnancy_kick_sessions")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(patch as any)
    .eq("id", id);

  if (error) {
    console.error("[pregnancy] Could not save the kick session:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Contractions
// ---------------------------------------------------------------------------

export async function getContractions(
  userId: string,
  pregnancyId: string
): Promise<Result<Contraction[]>> {
  const { data, error } = await supabase
    .from("pregnancy_contractions")
    .select("id, started_at, ended_at")
    .eq("user_id", userId)
    .eq("pregnancy_id", pregnancyId)
    .order("started_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("[pregnancy] Could not load contractions:", error.message);
    return { ok: false, message: describe(error) };
  }
  return {
    ok: true,
    value: (data ?? []).map((r) => ({ id: r.id, startedAt: r.started_at, endedAt: r.ended_at })),
  };
}

export async function startContraction(
  userId: string,
  pregnancyId: string,
  startedAt: string
): Promise<Result<string>> {
  const { data, error } = await supabase
    .from("pregnancy_contractions")
    .insert({ user_id: userId, pregnancy_id: pregnancyId, started_at: startedAt })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[pregnancy] Could not start timing:", error?.message);
    return { ok: false, message: error ? describe(error) : "Couldn't start timing." };
  }
  return { ok: true, value: data.id };
}

export async function endContraction(id: string, endedAt: string): Promise<WriteResult> {
  const { error } = await supabase
    .from("pregnancy_contractions")
    .update({ ended_at: endedAt })
    .eq("id", id);

  if (error) {
    console.error("[pregnancy] Could not stop timing:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}
