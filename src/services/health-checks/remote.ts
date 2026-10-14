import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typed } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";

/**
 * Database stage B2 (HANDOVER_API.md "Health checks are stored now — and only
 * the general ones"): health_check_states (done_on, hidden per general check),
 * custom_health_checks (name, interval_months, done_on) and
 * health_check_reminders (one active reminder per check; sender B4, neutral
 * body "You have a health check due", never the check's name).
 *
 * Owner-only, never shared: no professional policy exists on any of the three.
 * Every write sends only columns its grant allows:
 *   states    INSERT user_id, check_key, done_on, hidden · UPDATE done_on, hidden
 *   custom    INSERT user_id, name, interval_months, done_on · UPDATE name, interval_months, done_on
 *   reminders INSERT user_id, state_key | custom_check_id, remind_on, remind_at, repeat, every_n, active
 *             UPDATE remind_on, remind_at, repeat, every_n, active
 * So a state is "update, then insert if nothing matched" rather than an
 * upsert (an upsert would name user_id / check_key in its UPDATE half).
 */

// B2 tables are newer than lib/supabase/database.types.ts (generated from production): untyped here.
const supabase = typed as unknown as SupabaseClient;

export const GENERAL_CHECK_KEYS = ["bp", "glucose", "cholesterol", "hepatitis_c", "hiv", "bowel", "mammogram", "cervical", "psa"] as const;
export type GeneralCheckKey = (typeof GENERAL_CHECK_KEYS)[number];
export const isGeneralKey = (k: string): k is GeneralCheckKey => (GENERAL_CHECK_KEYS as readonly string[]).includes(k);

export type StateRow = { check_key: GeneralCheckKey; done_on: string | null; hidden: boolean };
export type CustomRow = { id: string; name: string; interval_months: number; done_on: string | null };
export type ReminderRow = {
  id: string;
  state_key: GeneralCheckKey | null;
  custom_check_id: string | null;
  remind_on: string;
  remind_at: string;
  repeat: "none" | "monthly" | "yearly" | "every_n_months";
  every_n: number | null;
  active: boolean;
};

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; message: string; code?: string };

function fail(error: { code?: string; message?: string } | null): { ok: false; message: string; code?: string } {
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE, code: "offline" };
  const code = error?.code ?? "";
  if (code === "23505") return { ok: false, message: "You already have this check.", code };
  return { ok: false, message: "Couldn't save. Try again.", code };
}

export async function fetchHealthCheckData(): Promise<Result<{ states: StateRow[]; custom: CustomRow[]; reminders: ReminderRow[] }>> {
  const [s, c, r] = await Promise.all([
    supabase.from("health_check_states").select("check_key, done_on, hidden"),
    supabase.from("custom_health_checks").select("id, name, interval_months, done_on").order("created_at"),
    supabase
      .from("health_check_reminders")
      .select("id, state_key, custom_check_id, remind_on, remind_at, repeat, every_n, active")
      .eq("active", true),
  ]);
  const err = s.error ?? c.error ?? r.error;
  if (err) return fail(err);
  return { ok: true, data: { states: (s.data ?? []) as StateRow[], custom: (c.data ?? []) as CustomRow[], reminders: (r.data ?? []) as ReminderRow[] } };
}

/** Writes done_on and / or hidden for one general check. */
export async function saveCheckState(userId: string, key: GeneralCheckKey, patch: { done_on?: string | null; hidden?: boolean }): Promise<Result> {
  const upd = await supabase.from("health_check_states").update(patch).eq("user_id", userId).eq("check_key", key).select("check_key");
  if (upd.error) return fail(upd.error);
  if ((upd.data ?? []).length > 0) return { ok: true, data: undefined };
  const ins = await supabase.from("health_check_states").insert({ user_id: userId, check_key: key, done_on: patch.done_on ?? null, hidden: patch.hidden ?? false });
  return ins.error ? fail(ins.error) : { ok: true, data: undefined };
}

export async function createCustomCheck(userId: string, v: { name: string; interval_months: number; done_on: string | null }): Promise<Result<string>> {
  const { data, error } = await supabase
    .from("custom_health_checks")
    .insert({ user_id: userId, name: v.name.trim(), interval_months: v.interval_months, done_on: v.done_on })
    .select("id")
    .single();
  if (error) return fail(error);
  return { ok: true, data: (data as { id: string }).id };
}

export async function updateCustomCheck(id: string, patch: { name?: string; interval_months?: number; done_on?: string | null }): Promise<Result> {
  const { error } = await supabase.from("custom_health_checks").update(patch).eq("id", id);
  return error ? fail(error) : { ok: true, data: undefined };
}

/** Removes the check; its reminder goes with it (ON DELETE CASCADE). */
export async function deleteCustomCheck(id: string): Promise<Result> {
  const { error } = await supabase.from("custom_health_checks").delete().eq("id", id);
  return error ? fail(error) : { ok: true, data: undefined };
}

export type ReminderInput = {
  remind_on: string;
  remind_at: string;
  repeat: ReminderRow["repeat"];
  every_n: number | null;
};

/** One active reminder per check: updates the active one, or inserts. */
export async function saveReminder(
  userId: string,
  subject: { state_key: GeneralCheckKey } | { custom_check_id: string },
  v: ReminderInput,
  existingId: string | null
): Promise<Result<string>> {
  if (existingId) {
    const { error } = await supabase.from("health_check_reminders").update({ ...v, active: true }).eq("id", existingId);
    return error ? fail(error) : { ok: true, data: existingId };
  }
  const { data, error } = await supabase
    .from("health_check_reminders")
    .insert({ user_id: userId, ...subject, ...v, active: true })
    .select("id")
    .single();
  if (error) return fail(error);
  return { ok: true, data: (data as { id: string }).id };
}

/** Removing keeps the history row: active = false (the partial unique index allows a new one). */
export async function deactivateReminder(id: string): Promise<Result> {
  const { error } = await supabase.from("health_check_reminders").update({ active: false }).eq("id", id);
  return error ? fail(error) : { ok: true, data: undefined };
}
