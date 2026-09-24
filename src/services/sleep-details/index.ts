import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";

// One night's sleep breakdown, from public.sleep_details.
//
// THE TABLE WAS ALWAYS THERE AND NOTHING EVER READ IT. Its columns are score,
// rem_min, deep_min, light_min, awake_min and summary — which is precisely,
// field for field, what `sleepDetail` in data/mockHealthData.ts invented: a
// score of 82, 96 minutes of REM, and the sentence "Solid night overall —
// deep sleep was a little below your weekly average", shown to every account
// including ones that had never worn anything to bed. This module reads the
// real row instead.
//
// READ-ONLY, because nothing in this app measures sleep stages. A breakdown
// like this comes from a wearable, and device sync is not built (see the
// Health tab's integrations card, which now says so rather than offering a
// switch). Rows will arrive when it is; until then this correctly returns
// nothing and every consumer hides its stage bars.

/** The four stages, which only mean anything as a complete set. */
export interface SleepStages {
  remMin: number;
  deepMin: number;
  lightMin: number;
  awakeMin: number;
}

export interface SleepDetail {
  /** yyyy-mm-dd — the night this describes. */
  date: string;
  /** Null when the source recorded no score. */
  score: number | null;
  /**
   * ALL FOUR OR NONE. Every stage column is nullable, and three stages plus a
   * hole is not a breakdown: the bar would be drawn to a total that excludes
   * the missing minutes, so each remaining segment would render wider than the
   * night it describes. A partial row yields null and the bars are skipped.
   */
  stages: SleepStages | null;
  summary: string | null;
}

export type SleepDetailsResult =
  | { ok: true; nights: SleepDetail[] }
  | { ok: false; message: string };

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to see your sleep detail.";
  }
  return "Couldn't load your sleep detail. Check your connection and try again.";
}

/**
 * Every night on record since `sinceDay`, oldest first.
 *
 * AN EMPTY LIST IS A NORMAL ANSWER, not a failure. An account with no wearable
 * has no rows here and never will until one is connected, so `nights: []` is
 * the ordinary case rather than an edge — and it is reported as `ok: true`, so
 * a caller can tell "nothing recorded" from "the read failed" and show an
 * empty state for the first without showing it for the second.
 *
 * A RANGE RATHER THAN THE LATEST ROW, because the detail sheet compares
 * nights against one another. It used to do that by taking the one mock night
 * and multiplying its four stages by a sine wave, so "this week's sleep" was
 * seven scalings of the same invented night.
 */
export async function getSleepDetails(
  userId: string,
  sinceDay: string
): Promise<SleepDetailsResult> {
  const { data, error } = await supabase
    .from("sleep_details")
    .select("sleep_date, score, rem_min, deep_min, light_min, awake_min, summary")
    .eq("user_id", userId)
    .gte("sleep_date", sinceDay)
    .order("sleep_date", { ascending: true });

  if (error) {
    console.error("[sleep-details] Could not load sleep detail:", error.message);
    return { ok: false, message: describe(error) };
  }

  const nights = (data ?? []).map((row) => {
    const { rem_min, deep_min, light_min, awake_min } = row;
    const complete =
      rem_min !== null && deep_min !== null && light_min !== null && awake_min !== null;
    return {
      date: row.sleep_date,
      score: row.score === null ? null : Number(row.score),
      stages: complete
        ? { remMin: rem_min, deepMin: deep_min, lightMin: light_min, awakeMin: awake_min }
        : null,
      summary: row.summary,
    };
  });

  return { ok: true, nights };
}

/** The most recent night, or null when nothing is recorded. */
export function latestNight(nights: SleepDetail[]): SleepDetail | null {
  return nights.length > 0 ? nights[nights.length - 1] : null;
}

/**
 * Total minutes across the four stages.
 *
 * The stage bars divide by this, and dividing by zero draws nothing sensible —
 * so a night whose stages sum to nothing reports null and the bars are skipped,
 * rather than every segment rendering at Infinity percent.
 */
export function totalSleepMinutes(stages: SleepStages): number | null {
  const total = stages.remMin + stages.deepMin + stages.lightMin + stages.awakeMin;
  return total > 0 ? total : null;
}
