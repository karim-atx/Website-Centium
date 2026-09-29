import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Achievement, PointsSummary, PointTier } from "./ladder";

export * from "./ladder";

// Achievements, points and tiers.
//
// EVERY NUMBER ON THESE SCREENS IS THE SERVER'S. my_achievements() evaluates
// and returns progress from achievement_progress(), the one SQL definition the
// evaluator itself reads, so the client cannot show a figure the awarder
// disagrees with. my_points_summary() sums points_ledger and resolves the tier
// against point_tiers. Nothing here adds, estimates or extrapolates: the old
// Explore hero derived points as "streak days x 100" plus a local bonus, and
// that is exactly the class of invention this replaces.
//
// NO UPSERTS, and on feature_milestones no update path exists to reach for
// anyway: the table's grant is INSERT (user_id, milestone) only, first_at is
// outside it so it cannot be back-dated, and there is no UPDATE or DELETE
// policy at all. A repeat insert is a 23505, which is the success case here
// rather than an error -- see recordFeatureMilestone.
//
// THE CLIENT CANNOT WRITE A POINT. points_ledger lost its INSERT grant and its
// INSERT policy, and user_achievements never had either; the only writer is
// evaluate_achievements, which no client role may execute. Calling
// my_achievements() is how an award happens, and it awards from server-side
// tables regardless of what this file sends -- which is nothing.

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

/**
 * The eight self-reported "I found this" markers.
 *
 * Kept as a literal union so a typo cannot reach the CHECK constraint, which
 * names exactly these eight inline and would answer a ninth with a 23514.
 */
export type FeatureMilestone =
  | "voice_logger"
  | "workout_metrics"
  | "exercise_library"
  | "health_records"
  | "explore_page"
  | "mind_journal"
  | "calendar"
  | "add_widget";

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to see your achievements.";
  }
  if (code === "42501") return "You don't have permission to read this. Sign in again.";
  return "Couldn't load your achievements. Check your connection and try again.";
}

/**
 * Every active achievement, with progress and whether it is earned.
 *
 * THIS CALL AWARDS. my_achievements() evaluates first and reads second -- two
 * statements, because a data-modifying CTE's effects are invisible to the rest
 * of its own statement and an inline evaluation would report a just-earned
 * badge as unearned. `newlyEarned` is true only for rows THIS call inserted,
 * which is what the unlock celebration fires on and why it cannot fire twice
 * for the same badge.
 */
export async function getAchievements(): Promise<Result<Achievement[]>> {
  const { data, error } = await supabase.rpc("my_achievements");
  if (error) return { ok: false, message: describe(error) };
  return {
    ok: true,
    value: (data ?? []).map((r) => ({
      key: r.key,
      category: r.category,
      title: r.title,
      description: r.description,
      icon: r.icon,
      points: r.points,
      groupKey: r.group_key,
      level: r.level,
      threshold: r.threshold,
      currentValue: r.current_value,
      sortOrder: r.sort_order,
      earnedAt: r.earned_at,
      newlyEarned: r.newly_earned,
    })),
  };
}

/**
 * The balance, the tier, the gap to the next one, and the split by source.
 *
 * A PURE READ -- it does not evaluate, so it cannot be used to farm an award.
 * That is why the Explore hero calls this and the Mind tab calls the other.
 */
export async function getPointsSummary(): Promise<Result<PointsSummary>> {
  const { data, error } = await supabase.rpc("my_points_summary");
  if (error) return { ok: false, message: describe(error) };
  const r = (data ?? [])[0];
  if (!r) return { ok: false, message: "Couldn't load your points. Try again." };
  return {
    ok: true,
    value: {
      balance: r.balance,
      tierName: r.tier_name,
      tierMinPoints: r.tier_min_points,
      nextTierName: r.next_tier_name,
      nextTierMinPoints: r.next_tier_min_points,
      pointsToNextTier: r.points_to_next_tier,
      achievementPoints: r.achievement_points,
      referralPoints: r.referral_points,
      otherPoints: r.other_points,
      achievementsEarned: r.achievements_earned,
    },
  };
}

/**
 * The tier ladder, for the pips.
 *
 * READ, NOT HARDCODED. The thresholds the Explore hero used to draw (0 / 5000
 * / 10000 / 15000 / 20000) are not the ones point_tiers holds (0 / 1000 / 3000
 * / 7500 / 15000), so a second copy in the client is a second answer waiting
 * to disagree with my_points_summary() about which tier somebody is.
 */
export async function getPointTiers(): Promise<Result<PointTier[]>> {
  const { data, error } = await supabase
    .from("point_tiers")
    .select("name, min_points, sort_order")
    .order("sort_order");
  if (error) return { ok: false, message: describe(error) };
  return {
    ok: true,
    value: (data ?? []).map((r) => ({
      name: r.name,
      minPoints: r.min_points,
      sortOrder: r.sort_order,
    })),
  };
}

/**
 * Record that this account has used a feature, once and for ever.
 *
 * FIRE AND FORGET, AND IDEMPOTENT BY THE PRIMARY KEY. A repeat is a 23505 and
 * is the expected outcome on every visit after the first -- the table exists
 * to hold one row per user per milestone, deliberately with no counter, route,
 * device or session, so a second insert failing IS the design working. Nothing
 * is awaited by a caller and nothing is shown either way; the badge appears on
 * the next my_achievements() call, and it is worth zero points because
 * self-reporting may unlock a badge and may never move a balance.
 */
export async function recordFeatureMilestone(
  userId: string,
  milestone: FeatureMilestone
): Promise<void> {
  const { error } = await supabase
    .from("feature_milestones")
    .insert({ user_id: userId, milestone });
  // 23505 is the repeat visit. Anything else is logged and dropped: a
  // milestone is not worth interrupting somebody's screen over.
  if (error && error.code !== "23505") {
    console.warn(`feature_milestones: ${milestone} not recorded`, error.message);
  }
}
