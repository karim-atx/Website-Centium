import { supabase } from "../../../lib/supabase/client";

// A personal reminder (Database 20261012010000): one per account, a cadence
// in days and the next date it is due. GENERIC BY DESIGN: it has no topic,
// label or note anywhere, and the notification always reads the same neutral
// pair, so nobody reading the row or the lock screen learns what it is for.
// The server's sweep sends it at or after 09:00 in the profile's timezone and
// moves next_due_on on by itself.

export type PersonalReminder = { cadenceDays: number; nextDueOn: string; enabled: boolean };

export const CADENCE_MIN = 1;
export const CADENCE_MAX = 365;

export async function fetchPersonalReminder(userId: string): Promise<{ ok: true; reminder: PersonalReminder | null } | { ok: false }> {
  const { data, error } = await supabase
    .from("personal_reminders")
    .select("cadence_days, next_due_on, enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { ok: false };
  return {
    ok: true,
    reminder: data ? { cadenceDays: data.cadence_days, nextDueOn: data.next_due_on, enabled: data.enabled } : null,
  };
}

/**
 * Update first, insert if there was no row. Not an upsert: the update grant
 * leaves out user_id, which an upsert's update branch would name.
 */
export async function savePersonalReminder(userId: string, r: PersonalReminder): Promise<boolean> {
  const row = { cadence_days: r.cadenceDays, next_due_on: r.nextDueOn, enabled: r.enabled };
  const { data, error } = await supabase.from("personal_reminders").update(row).eq("user_id", userId).select("user_id");
  if (error) return false;
  if (data && data.length > 0) return true;
  const { error: insertError } = await supabase.from("personal_reminders").insert({ user_id: userId, ...row });
  if (!insertError) return true;
  if (insertError.code === "23505") {
    const { error: retry } = await supabase.from("personal_reminders").update(row).eq("user_id", userId);
    return !retry;
  }
  return false;
}

export async function deletePersonalReminder(userId: string): Promise<boolean> {
  const { error } = await supabase.from("personal_reminders").delete().eq("user_id", userId);
  return !error;
}
