import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { ProfileTimezone } from "./logic";

// Task T: the profile's time zone, the ONE zone the app writes
// (Database 20261007000000 and 20261007010000). The server reads
// profiles.timezone first, then cycle_settings.timezone, then UTC, for every
// "today" it computes: the meditation summary, the four auto streaks and the
// cycle and pack days.

/**
 * The IANA zone this browser thinks it is in, or null.
 *
 * NULL RATHER THAN A FALLBACK: defaulting to 'UTC' would write a guess over a
 * real answer on any engine that does not say.
 */
export function browserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * Every zone this engine knows, for the picker. Empty when it cannot say;
 * the picker then offers the stored zone and the device's own.
 */
export function knownTimezones(): string[] {
  try {
    const supported = (
      Intl as typeof Intl & { supportedValuesOf?: (k: string) => string[] }
    ).supportedValuesOf;
    return supported ? supported("timeZone") : [];
  } catch {
    return [];
  }
}

export type TimezoneWrite = { ok: true } | { ok: false; message: string };

function describe(error: { code?: string; message?: string }): string {
  if (isOffline(error)) return OFFLINE_MESSAGE;
  // ATX50: a name the server does not know (or an empty string).
  if (error.code === "ATX50") return "That time zone isn't recognised. Pick another.";
  return "Couldn't save your time zone. Try again.";
}

export async function fetchProfileTimezone(userId: string): Promise<ProfileTimezone | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("timezone, timezone_chosen_at")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return { timezone: data.timezone, chosenAt: data.timezone_chosen_at };
}

/**
 * The device's zone, written only while the zone follows the device.
 *
 * THE CONDITION IS ALSO IN THE WRITE (`timezone_chosen_at is null`), not
 * only in the caller's read: if the user picks a zone on another device
 * between this tab's read and its write, the update matches no row and the
 * choice stands. `timezone_chosen_at` is never touched here.
 */
export async function writeDeviceTimezone(userId: string, zone: string): Promise<TimezoneWrite> {
  const { error } = await supabase
    .from("profiles")
    .update({ timezone: zone })
    .eq("id", userId)
    .is("timezone_chosen_at", null);
  return error ? { ok: false, message: describe(error) } : { ok: true };
}

/** A zone the user picked by hand: the device stops overwriting it. */
export async function chooseTimezone(userId: string, zone: string): Promise<TimezoneWrite> {
  const { error } = await supabase
    .from("profiles")
    .update({ timezone: zone, timezone_chosen_at: new Date().toISOString() })
    .eq("id", userId);
  return error ? { ok: false, message: describe(error) } : { ok: true };
}

/**
 * Back to following the device: the device's zone and no recorded choice,
 * IN ONE STATEMENT. A recorded choice cannot outlive its zone
 * (profiles_timezone_chosen_at_needs_timezone), so the two always move
 * together. With no device zone to offer, both are cleared.
 */
export async function followDeviceTimezone(userId: string, device: string | null): Promise<TimezoneWrite> {
  const { error } = await supabase
    .from("profiles")
    .update({ timezone: device, timezone_chosen_at: null })
    .eq("id", userId);
  return error ? { ok: false, message: describe(error) } : { ok: true };
}
