// A day's steps when a hand-logged reading (health_metrics) and a synced day
// (activity_daily, my_activity_days) both exist: the hand-logged one wins,
// as everywhere manual beats synced (Karim, Round J · J-2e). Home's Steps
// widget, the Steps page and the home-screen widget snapshot all read it
// from here. Pure, so it is tested on its own.

/** The day's steps: the hand-logged reading if any, else the synced day, else null. */
export function stepsOfDay(manual: number | null | undefined, synced: number | null | undefined): number | null {
  if (manual != null && manual > 0) return manual;
  if (synced != null && synced > 0) return synced;
  return null;
}

/** Every day's steps, hand-logged readings over synced days. */
export function stepsByDay(manual: readonly { date: string; value: number }[], synced: Readonly<Record<string, { steps: number | null }>>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [d, a] of Object.entries(synced)) {
    const v = stepsOfDay(null, a.steps);
    if (v !== null) out[d] = v;
  }
  for (const p of manual) {
    const v = stepsOfDay(p.value, null);
    if (v !== null) out[p.date] = v;
  }
  return out;
}
