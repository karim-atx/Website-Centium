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

/**
 * A Steps history day in its parts (Round J follow-up, Karim 2026-11-06): the
 * hand-logged count, the synced count (only when it came from a phone
 * source) and what the day shows. On a day with both, the row edits and
 * deletes the hand-logged count and the synced one gets its own line to
 * remove it from Centium.
 */
export interface StepsDayParts {
  shown: number | null;
  manual: number | null;
  synced: number | null;
  both: boolean;
}

export function stepsDayParts(manual: number | null | undefined, synced: number | null | undefined): StepsDayParts {
  const m = stepsOfDay(manual, null);
  const s = stepsOfDay(null, synced);
  return { shown: stepsOfDay(m, s), manual: m, synced: s, both: m !== null && s !== null };
}

/** The synced steps of a reader day: its steps when they came from a phone source, else null. */
export function syncedStepsOf(day: { steps: number | null; sources?: Partial<Record<string, string>> } | undefined): number | null {
  const s = day?.sources?.steps;
  return day && s && s !== "manual" ? day.steps : null;
}
