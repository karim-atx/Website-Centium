// The Today cards (Home's widgets and the Health tab) show THE DAY ONLY, never
// the latest reading from some other day, and each value is the member's own
// entry first, then what Apple Health or Health Connect synced (Karim,
// 2026-11-12; the same order as the server's health_source_rank and the
// detail pages). Steps keep their rule in stepsRule.ts. Pure, so it is tested
// on its own.

/** The member's own value if there is one, else the synced one, else null. Zero counts as none. */
export function ownFirst(own: number | null | undefined, synced: number | null | undefined): number | null {
  if (own != null && own > 0) return own;
  if (synced != null && synced > 0) return synced;
  return null;
}

/**
 * The night's sleep in hours: the hours logged by hand for that date
 * (health_metrics 'sleep'), else the synced main night's time asleep
 * (my_sleep_nights.asleep_min). A night is filed on the date the person woke.
 */
export function sleepHoursOn(ownHours: number | null | undefined, asleepMin: number | null | undefined): number | null {
  return ownFirst(ownHours, asleepMin != null ? asleepMin / 60 : null);
}

/** Every night's hours, hand-logged over synced, oldest first (week averages and trends). */
export function sleepHistory(
  own: readonly { date: string; value: number }[],
  nights: readonly { date: string; asleepMin: number | null }[]
): { date: string; value: number }[] {
  const byDate = new Map<string, number>();
  for (const n of nights) {
    const h = sleepHoursOn(null, n.asleepMin);
    if (h !== null) byDate.set(n.date, h);
  }
  for (const p of own) if (p.value > 0) byDate.set(p.date, p.value);
  return [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([date, value]) => ({ date, value }));
}

/** The day's calories burned: the hand-logged figure, else the synced day (my_activity_days.kcal_burned). */
export function kcalBurnedOn(own: number | null | undefined, synced: number | null | undefined): number | null {
  return ownFirst(own, synced);
}

/** Where a workout came from: logged in Centium, or synced. */
export type WorkoutSource = "manual" | "apple_health" | "android_health" | "whoop";

/**
 * The day's workout for the card: the latest one logged in Centium that day,
 * else the latest synced one, else null. `sessions` oldest first.
 */
export function workoutOfDay<T extends { date: string; source?: WorkoutSource | null }>(sessions: readonly T[], day: string): T | null {
  let own: T | null = null;
  let synced: T | null = null;
  for (const s of sessions) {
    if (s.date !== day) continue;
    if (!s.source || s.source === "manual") own = s;
    else synced = s;
  }
  return own ?? synced;
}
