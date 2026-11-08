import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { useHideNumbers } from "../../hooks/useHideNumbers";
import { activityByDay, useActivityDaily } from "../../services/health-metrics/b1";
import { fetchMyProgrammes, fetchProgrammeSchedule } from "../../services/programmes";
import { isOpen, sessionsOn } from "../../services/programmes/model";
import { buildWidgetSnapshot, reloadForWidgetAction, snapshotKey, type WorkoutToday } from "../../services/widgets/snapshotModel";
import { widgets } from "../../platform/widgets";
import { getLanguage, t } from "../../i18n/core";

/**
 * Round J · J-2c (website PLAN.md "Widget snapshot"; App-Centium ROUND_J.md
 * §5.1): keeps the phone's home-screen widgets in step with today's steps,
 * water, habits and workout. Mounted once, in the app only (App.tsx);
 * widgets.update() itself does nothing where widgets are off.
 *
 * Each value is the one its own page shows:
 * - steps: today's as Home and the Steps page show it (the hand-logged
 *   reading, else the synced day; stepsRule) of the step goal;
 * - water: the day total the water writes return (waterByDate), of the goal;
 * - habits: the Habits page's list and today's ticks, the first six;
 * - workout: today's programme session (what /app/workout?start=today
 *   starts), the first open one, else the first not skipped.
 *
 * Sent only when something changed (the time aside), a moment after the last
 * change, and again on a language change (AppContext remounts everything).
 * Never cleared from here: sign-out and the kill switch clear the phone's copy.
 *
 * Round K (App-Centium ROUND_K.md §2.3): the phone saves "+250 ml" and habit
 * ticks itself. The snapshot carries each habit's id, the member's day (the
 * same `today` the app's own ticks and water use) and whether
 * recovery-sensitive mode is known; after a widget action while the app is
 * open, today's water or the habits are re-read the way a save in the app
 * re-reads them (reloadMetrics, reloadHabits).
 */
const SEND_AFTER_MS = 800;
let lastSent: string | null = null;

/** Today's programme session, read the way ProgrammeSection reads it. */
function useWorkoutToday(today: string, signedIn: boolean): WorkoutToday {
  const [workout, setWorkout] = useState<WorkoutToday>({ kind: "unknown" });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const again = () => document.visibilityState === "visible" && setTick((n) => n + 1);
    document.addEventListener("visibilitychange", again);
    return () => document.removeEventListener("visibilitychange", again);
  }, []);
  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    void (async () => {
      const mine = await fetchMyProgrammes();
      if (!live || !mine.ok) return;
      const schedules = await Promise.all(mine.data.map((p) => fetchProgrammeSchedule(p.assignmentId)));
      if (!live || schedules.some((s) => !s.ok)) return;
      const rows = schedules.flatMap((s) => (s.ok ? sessionsOn(s.data, today) : []));
      const pick = rows.find(isOpen) ?? rows.find((r) => !r.skipped) ?? null;
      setWorkout(pick ? { kind: "session", title: pick.workoutName, week: pick.week, day: pick.day } : { kind: "none" });
    })();
    return () => {
      live = false;
    };
  }, [today, signedIn, tick]);
  return workout;
}

export function WidgetSnapshotSync() {
  const { authUserId, profileReady, user, today, healthSeries, stepsGoal, waterByDate, waterGoalMl, habits, habitsLoading, habitsError, metricsLoadedAt, recoveryModePending, reloadMetrics, reloadHabits } = useApp();
  const signedIn = !!authUserId && profileReady && user.onboarded;
  const hideNumbers = useHideNumbers();
  const activityRead = useActivityDaily(today, today);
  const activity = activityByDay(activityRead.data);
  // The day's readings have arrived (until then steps and water are left out).
  const metricsKnown = metricsLoadedAt !== null;
  const workout = useWorkoutToday(today, signedIn);

  // Today's hand-logged reading and synced day; the builder picks (manual first).
  const stepsSynced = activity[today]?.steps ?? null;
  const stepsManual = healthSeries.steps.history.find((p) => p.date === today)?.value ?? null;

  const snapshot = useMemo(
    () =>
      buildWidgetSnapshot({
        language: getLanguage(),
        hideNumbers,
        modeKnown: !recoveryModePending,
        date: today,
        now: new Date(),
        steps: metricsKnown && !activityRead.loading ? { manual: stepsManual, synced: stepsSynced, goal: stepsGoal } : null,
        water: metricsKnown ? { todayMl: waterByDate[today] ?? 0, goalMl: waterGoalMl } : null,
        habits: habitsLoading || habitsError ? null : habits.map((h) => ({ id: h.id, name: h.label, done: h.done })),
        workout,
        dayLabel: (week, day) => t("Week {week} · Day {day}", { week, day }),
      }),
    [hideNumbers, recoveryModePending, metricsKnown, activityRead.loading, stepsManual, stepsSynced, stepsGoal, waterByDate, today, waterGoalMl, habitsLoading, habitsError, habits, workout]
  );
  const key = snapshotKey(snapshot);

  useEffect(() => {
    if (!signedIn || key === lastSent) return;
    const id = window.setTimeout(() => {
      lastSent = key;
      void widgets.update({ ...snapshot, updatedAt: new Date().toISOString() }).catch((e: unknown) => {
        lastSent = null;
        console.warn("[widgets]", e);
      });
    }, SEND_AFTER_MS);
    return () => window.clearTimeout(id);
    // The key stands for the snapshot; the time inside it isn't a change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, key]);

  // A widget saved (or undid) water or a habit tick while the app was open:
  // re-read it. The latest reload functions are read through a ref so the
  // listener is added once per signed-in session, and removed on sign-out.
  const reloads = useRef({ metrics: reloadMetrics, habits: reloadHabits });
  useEffect(() => {
    reloads.current = { metrics: reloadMetrics, habits: reloadHabits };
  });
  useEffect(() => {
    if (!signedIn) return;
    return widgets.onAction(({ kind }) =>
      reloadForWidgetAction(kind, { metrics: () => reloads.current.metrics(), habits: () => void reloads.current.habits() })
    );
  }, [signedIn]);

  return null;
}
