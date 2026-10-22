// Market + Share 3.0 · W2 · How to earn, pure (C-MO.4.8).

/** The fields of an Achievement (services/achievements) this page reads. */
export interface EarnAchievement {
  key: string;
  title: string;
  points: number;
  groupKey: string | null;
  threshold: number;
  currentValue: number;
  sortOrder: number;
  earnedAt: string | null;
}

/**
 * The current logging streak, as the server measures it: the streak
 * achievements' (group logging_streak) current value, which is what pays
 * streak_7 / 30 / 100 / 365. Before my_achievements answers, the Home logging
 * streak (AppContext streaks, category "logging"); null when neither is known.
 */
export function streakNow(achievements: readonly EarnAchievement[] | null, streaks: readonly { category?: string; days: number }[]): number | null {
  const fromServer = achievements?.find((a) => /^streak_\d+$/.test(a.key));
  if (fromServer) return Math.max(0, Math.round(fromServer.currentValue));
  const logging = streaks.find((s) => s.category === "logging");
  return logging ? Math.max(0, logging.days) : null;
}

/**
 * The Achievements card's few rows (the board shows four): the two locked
 * ones closest to unlocking (by progress, then the list's own order), then
 * the two most recently unlocked. The streak ladder is left out (it has its
 * own card). Fewer when there aren't enough; the result keeps that order.
 */
export function pickAchievements(list: readonly EarnAchievement[], n = 4): EarnAchievement[] {
  const pool = list.filter((a) => a.groupKey !== "logging_streak" && !/^streak_\d+$/.test(a.key));
  const progress = (a: EarnAchievement) => (a.threshold > 0 ? Math.min(1, a.currentValue / a.threshold) : 0);
  const locked = pool
    .filter((a) => !a.earnedAt)
    .sort((a, b) => progress(b) - progress(a) || a.sortOrder - b.sortOrder);
  const unlocked = pool.filter((a) => a.earnedAt).sort((a, b) => ((b.earnedAt ?? "") < (a.earnedAt ?? "") ? -1 : (b.earnedAt ?? "") > (a.earnedAt ?? "") ? 1 : 0));
  const half = Math.ceil(n / 2);
  let take = locked.slice(0, half);
  let got = unlocked.slice(0, n - take.length);
  if (take.length + got.length < n) take = locked.slice(0, n - got.length);
  got = unlocked.slice(0, n - take.length);
  return [...take, ...got];
}
