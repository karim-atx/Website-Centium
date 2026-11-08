// Round J · J-2c: the home-screen widgets' snapshot (App-Centium ROUND_J.md
// §5.1; website PLAN.md "Widget snapshot"). Pure, so the rules are tested on
// their own; WidgetSnapshotSync reads the values and sends the result.
//
// - A part the app doesn't know yet (still loading, or the read failed) is
//   left out, and its widget says "Open Centium to see today".
// - habits: [] means none today; workout: null means nothing planned.
// - The workout's subtitle is only its day ("Week 2 · Day 3"), never volume or
//   kcal, and it is left out while hideNumbers is on.
// - The figures themselves are sent either way: the phone hides them while
//   hideNumbers is true.
// - Round K (App-Centium ROUND_K.md §2.3): each habit carries its habit_items
//   id, and the snapshot carries the member's day (the one the app's own ticks
//   and water file under) and whether recovery-sensitive mode is known. The
//   phone ticks and adds water from these with the app closed.
import type { WidgetSnapshot } from "../../platform/contracts";
import { stepsOfDay } from "../health-metrics/stepsRule";

export const WIDGET_HABITS_MAX = 6;

export type WorkoutToday =
  /** Not known yet (loading or failed): left out. */
  | { kind: "unknown" }
  /** Nothing planned today. */
  | { kind: "none" }
  | { kind: "session"; title: string; week: number; day: number };

export type SnapshotInput = {
  language: "en" | "ar";
  hideNumbers: boolean;
  /** Recovery-sensitive mode is known, on or off (false while it is still pending). */
  modeKnown: boolean;
  /** The member's today (yyyy-mm-dd), the day the app's own habit ticks and water are saved for. */
  date: string;
  now: Date;
  /** Today's hand-logged reading and synced day (the hand-logged one wins), or null while unknown. */
  steps: { manual: number | null; synced: number | null; goal: number | null } | null;
  water: { todayMl: number; goalMl: number | null } | null;
  /** Today's habits in the Habits page's order, or null while unknown. */
  habits: { id: string; name: string; done: boolean }[] | null;
  workout: WorkoutToday;
  /** "Week {week} · Day {day}", in the app's language. */
  dayLabel: (week: number, day: number) => string;
};

export function buildWidgetSnapshot(i: SnapshotInput): WidgetSnapshot {
  const s: WidgetSnapshot = { language: i.language, hideNumbers: i.hideNumbers, modeKnown: i.modeKnown, date: i.date, updatedAt: i.now.toISOString() };
  const stepsToday = i.steps ? stepsOfDay(i.steps.manual, i.steps.synced) : null;
  if (i.steps && stepsToday !== null) s.steps = { today: stepsToday, goal: i.steps.goal };
  if (i.water) s.water = { todayMl: i.water.todayMl, goalMl: i.water.goalMl };
  if (i.habits) s.habits = i.habits.slice(0, WIDGET_HABITS_MAX).map((h) => ({ id: h.id, name: h.name, done: h.done }));
  if (i.workout.kind === "none") s.workout = null;
  if (i.workout.kind === "session") {
    s.workout = { title: i.workout.title, subtitle: i.hideNumbers ? null : i.dayLabel(i.workout.week, i.workout.day) };
  }
  return s;
}

/** The snapshot without its time, to send only when something changed. */
export function snapshotKey(s: WidgetSnapshot): string {
  const { updatedAt: _updatedAt, ...rest } = s;
  return JSON.stringify(rest);
}

/** What a widget action reloads (ROUND_K.md §2.3): today's water, or the habits. Saved or not, the app re-reads. */
export function reloadForWidgetAction(kind: "water" | "habit", reload: { metrics: () => void; habits: () => void }): void {
  if (kind === "water") reload.metrics();
  else reload.habits();
}
