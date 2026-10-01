import { supabase } from "../../../lib/supabase/client";
import type { RecoveryMode } from "./logic";

// Task X: recovery_mode_settings, the account's recovery-sensitive mode.
//
// OWNER-ONLY BY THE DATABASE'S OWN RULES: select/insert/update/delete are all
// `auth.uid() = user_id`, no professional grant reaches it, and every admin
// path excludes it by design (Database 20260914130000 and after). Nothing in
// the professional view reads it, and nothing should.

export type RecoveryModeRead = { ok: true; mode: RecoveryMode | null } | { ok: false };

/** The account's row, null when there is none yet (= off). */
export async function fetchRecoveryMode(userId: string): Promise<RecoveryModeRead> {
  const { data, error } = await supabase
    .from("recovery_mode_settings")
    .select("enabled, intro_seen")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { ok: false };
  return { ok: true, mode: data ? { enabled: data.enabled, introSeen: data.intro_seen } : null };
}

/**
 * Writes the setting: update first, insert if there was no row.
 *
 * NOT AN UPSERT, for the reason cycle_settings gives: the UPDATE grant covers
 * only enabled and intro_seen, and an upsert's update branch would name
 * user_id and be refused once the row exists.
 */
export async function saveRecoveryMode(userId: string, mode: RecoveryMode): Promise<boolean> {
  const row = { enabled: mode.enabled, intro_seen: mode.introSeen };
  const { data, error } = await supabase
    .from("recovery_mode_settings")
    .update(row)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return false;
  if (data && data.length > 0) return true;
  const { error: insertError } = await supabase.from("recovery_mode_settings").insert({ user_id: userId, ...row });
  if (!insertError) return true;
  // Another tab created it in between: one more update settles it.
  if (insertError.code === "23505") {
    const { error: retryError } = await supabase.from("recovery_mode_settings").update(row).eq("user_id", userId);
    return !retryError;
  }
  return false;
}
