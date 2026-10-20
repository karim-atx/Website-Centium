import { supabase } from "../../../lib/supabase/client";

// Release 3 · W7 (CU1 logger): the two reads the logger makes for a coach's
// routine. Pure formatting is in ./coachLogic.

/**
 * Weights from 1RM (DB-5, follow-up 20261124160000): "show
 * resolve_weight(one_rm, intensity_pct, unit) when rendering. Nothing is
 * stored." One call per exercise that has both, keyed by the caller's key;
 * a failed call leaves that key out, so the line falls back to the routine's
 * own weight.
 */
export async function resolveWeights(
  items: { key: string; oneRm: number; intensityPct: number }[],
  unit: "kg" | "lb" = "kg"
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await Promise.all(
    items.map(async ({ key, oneRm, intensityPct }) => {
      const { data, error } = await supabase.rpc("resolve_weight", {
        p_one_rm: oneRm,
        p_intensity_pct: intensityPct,
        p_unit: unit,
      });
      if (error) {
        console.error("[workout] resolve_weight failed:", error.message);
        return;
      }
      const kg = data == null ? null : Number(data);
      if (kg != null && Number.isFinite(kg) && kg > 0) out[key] = kg;
    })
  );
  return out;
}

/**
 * Whether the database marked a just-saved session as sent to the coach.
 *
 * workout_sessions_tell_coach (AFTER INSERT) notifies the coach and stamps
 * results_sent_at, but only when the routine was assigned by a professional
 * the client is still connected to AND shares Workout activity with. The
 * insert's own RETURNING predates that stamp, so it is read back here. The
 * session is found by its routine and start, which the logger just wrote.
 */
export async function readResultsSent(userId: string, routineId: string, startedAt: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("results_sent_at")
    .eq("user_id", userId)
    .eq("routine_id", routineId)
    .eq("started_at", startedAt)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[workout] Could not read the results state:", error.message);
    return false;
  }
  return !!(data as { results_sent_at: string | null } | null)?.results_sent_at;
}

/** Sessions the database marked as sent to a coach, with their swap counts (History "Sent to"). */
export async function fetchSentSessions(userId: string): Promise<Record<string, { swaps: number }>> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, swaps")
    .eq("user_id", userId)
    .not("results_sent_at", "is", null);
  if (error) {
    console.error("[workout] Could not read sent sessions:", error.message);
    return {};
  }
  const out: Record<string, { swaps: number }> = {};
  for (const r of (data ?? []) as { id: string; swaps: unknown }[]) {
    out[r.id] = { swaps: Array.isArray(r.swaps) ? r.swaps.length : 0 };
  }
  return out;
}
