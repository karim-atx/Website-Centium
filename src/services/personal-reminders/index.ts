import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";

// A personal reminder (Database 20261012010000): one per account, a cadence
// in days and the next date it is due. GENERIC BY DESIGN: it has no topic,
// label or note anywhere, and the notification always reads the same neutral
// pair, so nobody reading the row or the lock screen learns what it is for.
// The server's sweep sends it at or after 09:00 in the profile's timezone and
// moves next_due_on on by itself.

export type PersonalReminder = { cadenceDays: number; nextDueOn: string; enabled: boolean };

export const CADENCE_MIN = 1;
export const CADENCE_MAX = 365;

type Failed = { ok: false; message: string };

/** Round D O12: a dropped connection says so; anything else the caller's line. */
const failed = (error: unknown, fallback: string): Failed => ({ ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : fallback });

export async function fetchPersonalReminder(userId: string): Promise<{ ok: true; reminder: PersonalReminder | null } | Failed> {
  const { data, error } = await supabase
    .from("personal_reminders")
    .select("cadence_days, next_due_on, enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return failed(error, "Couldn't load your reminder. Please try again.");
  return {
    ok: true,
    reminder: data ? { cadenceDays: data.cadence_days, nextDueOn: data.next_due_on, enabled: data.enabled } : null,
  };
}

/**
 * Update first, insert if there was no row. Not an upsert: the update grant
 * leaves out user_id, which an upsert's update branch would name.
 */
export async function savePersonalReminder(userId: string, r: PersonalReminder): Promise<{ ok: true } | Failed> {
  const fallback = "Couldn't save. Please try again.";
  const row = { cadence_days: r.cadenceDays, next_due_on: r.nextDueOn, enabled: r.enabled };
  const { data, error } = await supabase.from("personal_reminders").update(row).eq("user_id", userId).select("user_id");
  if (error) return failed(error, fallback);
  if (data && data.length > 0) return { ok: true };
  const { error: insertError } = await supabase.from("personal_reminders").insert({ user_id: userId, ...row });
  if (!insertError) return { ok: true };
  if (insertError.code === "23505") {
    const { error: retry } = await supabase.from("personal_reminders").update(row).eq("user_id", userId);
    return retry ? failed(retry, fallback) : { ok: true };
  }
  return failed(insertError, fallback);
}

export async function deletePersonalReminder(userId: string): Promise<{ ok: true } | Failed> {
  const { error } = await supabase.from("personal_reminders").delete().eq("user_id", userId);
  return error ? failed(error, "Couldn't remove it. Please try again.") : { ok: true };
}
