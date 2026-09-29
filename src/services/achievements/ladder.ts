// Shaping what my_achievements() returns into what the screens draw.
//
// NOTHING HERE COMPUTES PROGRESS, A POINT TOTAL OR A TIER. Every number this
// module handles arrived from the server: current_value and threshold come
// from achievement_progress(), the balance and the tier come from
// my_points_summary(), and both are computed in one place in SQL precisely so
// a client cannot show a number the evaluator disagrees with. What is left for
// this file is arrangement — which rung of a ladder to draw, in what order,
// under which heading — and it is pure so it can be tested without a database.
//
// THE LADDERS ARE NOT ALL THE SAME SHAPE, which is the whole reason this
// exists. Most come in threes with bronze/silver/gold levels; the logging
// streak has SEVEN rungs and no level at all. The catalogue's own rule is that
// a group is ordered by `threshold` and `level` is an optional label on top of
// that ordering, so everything here sorts by threshold and treats the level as
// decoration. A ladder with no levels then needs no special case.

import type { Database } from "../../../lib/supabase/database.types";

export type AchievementCategory = Database["public"]["Enums"]["achievement_category"];
export type AchievementLevel = Database["public"]["Enums"]["achievement_level"];

/** One row of my_achievements(), in the app's own casing. */
export interface Achievement {
  key: string;
  category: AchievementCategory;
  title: string;
  description: string;
  icon: string;
  points: number;
  groupKey: string | null;
  level: AchievementLevel | null;
  threshold: number;
  currentValue: number;
  sortOrder: number;
  /** When it was earned, or null if it has not been. */
  earnedAt: string | null;
  /** True only for rows the call that returned this one actually inserted. */
  newlyEarned: boolean;
}

/** One row of my_points_summary(). */
export interface PointsSummary {
  balance: number;
  tierName: string;
  tierMinPoints: number;
  nextTierName: string | null;
  nextTierMinPoints: number | null;
  pointsToNextTier: number | null;
  achievementPoints: number;
  referralPoints: number;
  otherPoints: number;
  achievementsEarned: number;
}

/** One row of point_tiers, for the pips. */
export interface PointTier {
  name: string;
  minPoints: number;
  sortOrder: number;
}

/**
 * A ladder, or a one-off standing alone.
 *
 * `rungs` is every achievement in the group, ascending by threshold. A one-off
 * is a group of one, so the grid has a single kind of thing to draw.
 */
export interface Badge {
  /** The group_key, or the achievement's own key when it stands alone. */
  id: string;
  category: AchievementCategory;
  rungs: Achievement[];
  /** The highest rung earned, or null while the whole ladder is locked. */
  earned: Achievement | null;
  /** The lowest unearned rung, or null once the ladder is finished. */
  next: Achievement | null;
  /** What the grid shows: the next rung to chase, or the top one when done. */
  display: Achievement;
  /** 0–1 towards `next`, measured from the rung below it. 1 when finished. */
  progress: number;
  /** How much more of the measured thing `next` needs. Null when finished. */
  remaining: number | null;
  /** Points already banked from this ladder. */
  pointsEarned: number;
  /** sort_order of the lowest rung, so a ladder sits where its group starts. */
  sortOrder: number;
}

export const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  getting_started: "Getting started",
  nutrition: "Nutrition",
  training: "Training",
  health: "Health",
  mind: "Mind",
  consistency: "Consistency",
  community: "Community",
  explorer: "Explorer",
};

/** The catalogue's own category order, which sort_order is assigned within. */
export const CATEGORY_ORDER: AchievementCategory[] = [
  "getting_started",
  "nutrition",
  "training",
  "health",
  "mind",
  "consistency",
  "community",
  "explorer",
];

export const LEVEL_LABEL: Record<AchievementLevel, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
};

function isEarned(a: Achievement): boolean {
  return a.earnedAt !== null;
}

/**
 * Group the flat row set into badges.
 *
 * ORDER IS THE SERVER'S. Rows arrive `order by category, sort_order` and a
 * group's rungs are consecutive within that, so a badge takes the sort_order
 * of its lowest rung and the whole list stays in the catalogue's sequence
 * without the client holding a second copy of it.
 */
export function toBadges(rows: readonly Achievement[]): Badge[] {
  const byGroup = new Map<string, Achievement[]>();
  for (const row of rows) {
    const id = row.groupKey ?? row.key;
    const bucket = byGroup.get(id);
    if (bucket) bucket.push(row);
    else byGroup.set(id, [row]);
  }

  const badges: Badge[] = [];
  for (const [id, group] of byGroup) {
    // Ascending by threshold, NOT by level: the seven-rung streak ladder
    // carries no level, and the catalogue guarantees thresholds are unique
    // within a group.
    const rungs = [...group].sort((a, b) => a.threshold - b.threshold);
    const earned = [...rungs].reverse().find(isEarned) ?? null;
    const next = rungs.find((r) => !isEarned(r)) ?? null;

    // The floor progress is measured from: the rung below `next`, so a ladder
    // does not restart its bar at zero after every rung. A ladder whose first
    // rung is unearned measures from 0.
    const floor = next ? (rungs[rungs.indexOf(next) - 1]?.threshold ?? 0) : 0;
    const current = rungs[0]?.currentValue ?? 0;

    badges.push({
      id,
      category: rungs[0]!.category,
      rungs,
      earned,
      next,
      // WHAT THE TILE IS ABOUT. An unfinished ladder shows the rung being
      // chased; a finished one shows the top rung it ended on.
      display: next ?? rungs[rungs.length - 1]!,
      progress: next ? clamp01((current - floor) / Math.max(1, next.threshold - floor)) : 1,
      remaining: next ? Math.max(0, next.threshold - current) : null,
      pointsEarned: rungs.filter(isEarned).reduce((sum, r) => sum + r.points, 0),
      sortOrder: Math.min(...rungs.map((r) => r.sortOrder)),
    });
  }

  return badges.sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      a.sortOrder - b.sortOrder
  );
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * "130 more to reach Silver", or null once a ladder is finished.
 *
 * NAMED BY LEVEL WHEN THERE IS ONE, BY TITLE WHEN THERE IS NOT. The logging
 * streak's seven rungs carry no level, so "42 more to reach Silver" has
 * nothing to say about them and "42 more to reach A month straight" does.
 */
export function nextRungLabel(badge: Badge): string | null {
  if (!badge.next || badge.remaining === null) return null;
  const name = badge.next.level ? LEVEL_LABEL[badge.next.level] : badge.next.title;
  return `${badge.remaining.toLocaleString()} more to reach ${name}`;
}

/** Only the categories that actually have badges, in the catalogue's order. */
export function categoriesPresent(badges: readonly Badge[]): AchievementCategory[] {
  const seen = new Set(badges.map((b) => b.category));
  return CATEGORY_ORDER.filter((c) => seen.has(c));
}

/**
 * The most recent unlocks, newest first.
 *
 * Reads earned_at rather than the order rows arrive in, because rows arrive in
 * catalogue order and "recent" is about time.
 */
export function recentlyUnlocked(rows: readonly Achievement[], limit = 3): Achievement[] {
  return rows
    .filter((r) => r.earnedAt !== null)
    .sort((a, b) => (a.earnedAt! < b.earnedAt! ? 1 : a.earnedAt! > b.earnedAt! ? -1 : 0))
    .slice(0, limit);
}

/**
 * How far along the current tier the balance is, 0–1.
 *
 * 1 at the top of the ladder, where there is no next tier to be partway to.
 */
export function tierProgress(summary: PointsSummary): number {
  if (summary.nextTierMinPoints === null) return 1;
  const span = summary.nextTierMinPoints - summary.tierMinPoints;
  if (span <= 0) return 1;
  return clamp01((summary.balance - summary.tierMinPoints) / span);
}

/** Whether a pip is lit: its floor has been reached. */
export function tierReached(tier: PointTier, summary: PointsSummary): boolean {
  return summary.balance >= tier.minPoints;
}

/** "12 of 55" — earned badges over the whole active catalogue. */
export function earnedCount(rows: readonly Achievement[]): { earned: number; total: number } {
  return { earned: rows.filter(isEarned).length, total: rows.length };
}
