import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { MeditationSummary } from "./logic";

// The meditation log (Database 20261006000000..40000).
//
// WRITTEN ONCE, AT THE END. There is no UPDATE grant or policy, so a session
// is inserted when it stops, with the time actually spent; there is no
// "open a row, close it later".

export interface MeditationSessionInput {
  userId: string;
  startedAt: Date;
  durationSeconds: number;
  kind: string;
  /** Ran until the user stopped it (true), or was interrupted (false).
   *  ALWAYS SENT: the column has no default, on purpose. Only completed
   *  sessions count towards the meditation badges; both count as minutes. */
  completed: boolean;
}

export async function logMeditationSession(input: MeditationSessionInput): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const { error } = await supabase.from("meditation_sessions").insert({
      user_id: input.userId,
      started_at: input.startedAt.toISOString(),
      duration_seconds: input.durationSeconds,
      kind: input.kind,
      completed: input.completed,
    });
    if (!error) return { ok: true };
    if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
    // ATX02: 20 sessions an hour. Real use does not reach it.
    if (error.code === "ATX02") return { ok: false, message: "That's a lot of sessions in an hour. Try again a little later." };
    console.error("[meditation] Could not save a session:", error.code, error.message);
    return { ok: false, message: "Couldn't save this session." };
  } catch (e) {
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : "Couldn't save this session." };
  }
}

/**
 * my_meditation_summary(): always one row, zeros rather than nothing, so a
 * null here only ever means the read failed.
 *
 * "This week" is the CALENDAR week (Monday to today) in the user's zone and
 * resets on Monday. The zone is cycle_settings.timezone; an account with no
 * cycle settings is counted in UTC (a known schema limitation).
 */
export async function fetchMeditationSummary(): Promise<MeditationSummary | null> {
  try {
    const { data, error } = await supabase.rpc("my_meditation_summary");
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return {
      secondsToday: row.seconds_today,
      secondsThisWeek: row.seconds_this_week,
      sessionsThisWeek: row.sessions_this_week,
      streakDays: row.current_streak_days,
    };
  } catch {
    return null;
  }
}
