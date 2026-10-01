import { supabase } from "../../../lib/supabase/client";

// The account's on/off setting (Database 20261012000000): ONE COLUMN, and the
// row's existence IS the setting. On is an insert, off is a delete that leaves
// nothing, and there is nothing to update.
//
// NEVER CACHED. The value is held in memory only and read fresh: an admin who
// corrects somebody's age to under 18 deletes the row silently, so the app
// must notice it gone without having been told. It is never sent anywhere,
// never put in a URL, an event or a payload, and never stored on the device.

export type SettingRead = { ok: true; on: boolean } | { ok: false };

export async function readSetting(): Promise<SettingRead> {
  const { data, error } = await supabase.from("advanced_monitoring").select("user_id").limit(1);
  if (error) return { ok: false };
  return { ok: true, on: (data ?? []).length > 0 };
}

export type TurnOnResult = { ok: true } | { ok: false; reason: "adults-only" | "failed" };

export async function turnOn(userId: string): Promise<TurnOnResult> {
  const { error } = await supabase.from("advanced_monitoring").insert({ user_id: userId });
  if (!error || error.code === "23505") return { ok: true };
  // ATX54: under 18, or no date of birth on file. Its message names nothing.
  if (error.code === "ATX54") return { ok: false, reason: "adults-only" };
  return { ok: false, reason: "failed" };
}

export async function turnOff(userId: string): Promise<boolean> {
  const { error } = await supabase.from("advanced_monitoring").delete().eq("user_id", userId);
  return !error;
}
