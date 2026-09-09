import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { ClientNutrition, ClientWorkoutActivity } from "../../types";
import { localDayOf, todayLocal } from "../../utils/date";

// A professional's read of their clients' own data.
//
// Separate from services/roster, which is about the RELATIONSHIP — who is on
// the roster, when they joined, what they have consented to. This module is
// about what those consents unlock, and everything in it is PHI-adjacent.
//
// THE GATE IS RLS, NOT THIS CODE. `food_log_entries_select_granted_professional`
// is `using (has_client_access(user_id, 'food_diary'))`, and since the consent
// fix that function requires BOTH an active grant for the category AND an
// undisconnected professional_clients row. There is deliberately no
// client-side permission check here to duplicate it: a check in the browser
// is a courtesy, not a control, and two copies of a rule drift apart.
//
// WHAT THIS CODE MUST STILL DO IS NOT MISREAD A DENIAL. A row-policy refusal
// on SELECT is silent — zero rows, `error` null — which is byte-identical to
// "this client has logged nothing". Callers therefore pass only clients they
// already know have granted `food_diary`, and an empty result for one of them
// means an empty diary and nothing else. Never infer consent from row count.

/** How far back a "most recent logged day" may be found. */
const LOOKBACK_DAYS = 30;

export type ClientNutritionResult =
  | { ok: true; byClient: Record<string, ClientNutrition | null> }
  | { ok: false; message: string };

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to see your clients' data.";
  }
  return "Could not load your clients' data.";
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * The most recently logged day, per client, for clients who have granted
 * `food_diary`.
 *
 * ONE QUERY FOR THE WHOLE ROSTER, not one per client. A professional with
 * thirty clients would otherwise open thirty round trips on every dashboard
 * load, and the grouping is trivial to do here.
 *
 * A client present in `clientIds` is always present in `byClient` — as `null`
 * when they have logged nothing. That is what lets the caller tell "shared but
 * empty" from "not requested because not shared", which are different things
 * that must render differently.
 *
 * Returns `ok: false` rather than an empty map on failure, for the same reason
 * getDiaryEntries does: a caller that cannot distinguish an error from an
 * empty diary will happily render "no meals logged" over a network blip.
 */
export async function fetchClientNutrition(clientIds: string[]): Promise<ClientNutritionResult> {
  if (clientIds.length === 0) return { ok: true, byClient: {} };

  const { data, error } = await supabase
    .from("food_log_entries")
    .select("user_id, logged_date, calories, protein_g, carbs_g, fat_g")
    .in("user_id", clientIds)
    .gte("logged_date", isoDaysAgo(LOOKBACK_DAYS))
    .order("logged_date", { ascending: false });

  if (error) {
    console.error("[professional-client] Could not read client diaries:", error.message);
    return { ok: false, message: describe(error) };
  }

  // Seed every requested client as "shared, nothing logged". Rows below
  // upgrade the ones that have data; whoever is left keeps the null, which is
  // a real answer rather than a missing one.
  const byClient: Record<string, ClientNutrition | null> = {};
  for (const id of clientIds) byClient[id] = null;

  for (const row of data ?? []) {
    const id = row.user_id;
    if (!(id in byClient)) continue;

    const current = byClient[id];
    // Rows arrive newest-first, so the first date seen for a client is their
    // most recent one; anything older is a different day and is skipped
    // rather than summed into it.
    if (current && current.lastLoggedDate !== row.logged_date) continue;

    if (!current) {
      byClient[id] = {
        lastLoggedDate: row.logged_date,
        calories: Number(row.calories),
        protein: Number(row.protein_g),
        carbs: Number(row.carbs_g),
        fat: Number(row.fat_g),
        entryCount: 1,
      };
    } else {
      current.calories += Number(row.calories);
      current.protein += Number(row.protein_g);
      current.carbs += Number(row.carbs_g);
      current.fat += Number(row.fat_g);
      current.entryCount += 1;
    }
  }

  return { ok: true, byClient };
}

// ---------------------------------------------------------------------------
// Workout activity
// ---------------------------------------------------------------------------

export type ClientWorkoutResult =
  | { ok: true; byClient: Record<string, ClientWorkoutActivity | null> }
  | { ok: false; message: string };

/**
 * The most recent session per client, for clients who have granted
 * `workout_activity`.
 *
 * Same shape and same rules as fetchClientNutrition above: one batched query
 * for the whole roster, every requested client present in the result — as
 * `null` when they have never logged — and `ok: false` rather than an empty
 * map on failure, so a network error is never rendered as "nobody trained".
 *
 * WHICH DAY "TODAY" IS, and whose. Sessions are stored as timestamptz, so
 * reducing one to a day is a timezone decision rather than a lookup. Both
 * sides of the comparison use the READING PROFESSIONAL's local day: taking
 * the UTC day off started_at instead would disagree with the client's own
 * app, which files a session under the day it started locally, for every
 * session either side of a UTC midnight.
 *
 * For a professional and client in the same timezone — the ordinary case —
 * that is exactly right. Across timezones it stays an approximation, since
 * nothing stores the client's own zone; see the README follow-up.
 */
export async function fetchClientWorkoutActivity(
  clientIds: string[]
): Promise<ClientWorkoutResult> {
  if (clientIds.length === 0) return { ok: true, byClient: {} };

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("user_id, started_at")
    .in("user_id", clientIds)
    .gte("started_at", `${isoDaysAgo(LOOKBACK_DAYS)}T00:00:00Z`)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("[professional-client] Could not read client workouts:", error.message);
    return { ok: false, message: describe(error) };
  }

  const today = todayLocal();
  const byClient: Record<string, ClientWorkoutActivity | null> = {};
  for (const id of clientIds) byClient[id] = null;

  for (const row of data ?? []) {
    const id = row.user_id;
    if (!(id in byClient)) continue;
    // Rows arrive newest-first, so the first one seen for a client is their
    // most recent session; later rows are older days and are skipped.
    if (byClient[id]) continue;
    const day = localDayOf(row.started_at);
    byClient[id] = { lastSessionDate: day, trainedToday: day === today };
  }

  return { ok: true, byClient };
}
