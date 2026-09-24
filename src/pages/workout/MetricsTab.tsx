import { useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Sparkline } from "../../components/health/Sparkline";
import { OneRepMaxesSheet } from "../../components/workout/OneRepMaxesSheet";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { TrendingUp, Dumbbell, Scale3D, Flame, Scale } from "lucide-react";
import { countsTowardVolume } from "../../services/workout/session";

// QA 12.0: "Rework the metrics tab... Limiting the default view to 3-5
// primary metrics (rather than overwhelming users with everything at
// once)... deeper analytics available via drill-down." The reference
// table's 6 categories (Strength/Volume/Balance/Recovery/Adherence/Body
// composition) collapse into 4 cards here — Recovery folds into Adherence
// since this prototype's only real "did they show up" signal is the
// workout streak, which is also the explicit "Adherence should be
// connected to the streaks tab" ask.

const balanceColors: Record<string, string> = {
  back: "#7D6BB5",
  chest: "#D9A441",
  shoulders: "#6F9993",
  quads: "#4C8FD1",
  hamstrings: "#9C4F7C",
  glutes: "#C97B84",
  bicep: "#8C7CC4",
  tricep: "#B58F5A",
  core: "#5FA88F",
  cardio: "#E08E6D",
  olympic: "#6B8FB5",
};

export default function MetricsTab() {
  const { workoutSessions, personalRecords, streaks, weightByDate, exerciseCatalog, customExercises } =
    useApp();
  const [oneRmOpen, setOneRmOpen] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);

  // REAL SESSIONS ONLY. This used to begin with six invented numbers —
  // 4200, 4550, 4100, 4820, 5010, 4700 — so a brand-new account opened the
  // Metrics tab to a volume trend it had never produced, and the first real
  // session was compared against an average of fiction. A chart with one
  // point is honest; a chart with six borrowed ones is not.
  const volumePoints = workoutSessions.map((s) => s.totalVolumeKg);
  const lastVolume = volumePoints.length > 0 ? volumePoints[volumePoints.length - 1] : 0;

  /**
   * How many sessions before "vs your recent average" means anything.
   *
   * THREE PRIOR SESSIONS PLUS THE ONE BEING COMPARED. With one prior, the
   * "average" is that single session and a normal week-to-week swing reads as
   * a 30% collapse; the deload advice this card gives would then be triggered
   * by noise. Four is the smallest number where the comparison is a trend
   * rather than a pair.
   */
  const MIN_SESSIONS_FOR_TREND = 4;
  const hasTrend = volumePoints.length >= MIN_SESSIONS_FOR_TREND;
  const priorAvg =
    volumePoints.length > 1
      ? volumePoints.slice(0, -1).reduce((a, b) => a + b, 0) / (volumePoints.length - 1)
      : lastVolume;
  const volumeChangePct =
    hasTrend && priorAvg > 0 ? Math.round(((lastVolume - priorAvg) / priorAvg) * 100) : 0;
  const prCount = Object.keys(personalRecords).length;


  /**
   * Completed sets per primary muscle group, across every logged session.
   *
   * MATCHED BY ID, NOT BY NAME. A logged exercise carries the library
   * reference it was performed against — catalogExerciseId or
   * customExerciseId — and matching on the NAME instead meant a movement
   * stopped counting the moment it was renamed: every set of "Sandbag Carry"
   * vanished from this chart when it became "Sandbag Shuttle Run", because
   * the log keeps the name it was logged under and the library no longer had
   * one to match. Renaming your own exercise is not a reason to lose your
   * training history.
   *
   * The name is still the LAST resort, for rows written before those
   * references existed — services/workout/log's header is explicit that they
   * were left null and are not backfilled.
   */
  const muscleGroupTally = useMemo(() => {
    const catalogById = new Map(exerciseCatalog.map((e) => [e.id, e]));
    const customById = new Map(customExercises.filter((e) => e.id).map((e) => [e.id!, e]));
    const byName = new Map(exerciseCatalog.map((e) => [e.name, e]));

    const tally: Record<string, number> = {};
    for (const session of workoutSessions) {
      for (const ex of session.exercises) {
        const definition =
          (ex.catalogExerciseId ? catalogById.get(ex.catalogExerciseId) : undefined) ??
          (ex.customExerciseId ? customById.get(ex.customExerciseId) : undefined) ??
          byName.get(ex.name);
        const group = definition?.muscleGroups?.[0];
        if (!group) continue;
        tally[group] = (tally[group] ?? 0) + ex.sets.filter(countsTowardVolume).length;
      }
    }
    return tally;
  }, [workoutSessions, exerciseCatalog, customExercises]);

  const totalSets = Object.values(muscleGroupTally).reduce((a, b) => a + b, 0);
  const sortedGroups = Object.entries(muscleGroupTally).sort((a, b) => b[1] - a[1]);
  const topGroup = sortedGroups[0];
  const dominantShare = topGroup && totalSets > 0 ? topGroup[1] / totalSets : 0;

  // By category first — "s3" was the mock seed's id and a hydrated row carries
  // a uuid. The label match stays as the fallback for a pre-hydration render.
  const workoutStreak =
    streaks.find((s) => s.category === "workout") ?? streaks.find((s) => /workout/i.test(s.label));

  const weightSeries = Object.entries(weightByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);

  return (
    <div className="animate-fade-slide-up space-y-5">
      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">Volume trend</p>
          <TrendingUp size={14} className="text-primary" />
        </div>
        {volumePoints.length === 0 ? (
          <p className="text-sm text-charcoal-faint">
            Finish a workout and the volume you lifted appears here.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-charcoal">{lastVolume.toLocaleString()} kg</p>
                <p className="text-xs text-charcoal-faint">Last logged session</p>
              </div>
              <Sparkline values={volumePoints} color="#7D6BB5" width={140} height={44} />
            </div>
            {/* QA 12.0: "Every visualization should ideally suggest a next
                action (e.g., 'volume dropped 15% — consider a deload')." Said
                only once there is enough to compare against: with two or three
                sessions the "average" is one or two numbers, and an ordinary
                week-to-week swing would trigger deload advice. */}
            {!hasTrend ? (
              <p className="text-xs text-charcoal-faint mt-3">
                Log a few more sessions to see trends.
              </p>
            ) : volumeChangePct <= -15 ? (
              <p className="text-xs font-semibold text-status-high bg-status-high-bg rounded-full px-3 py-1.5 mt-3 inline-block">
                Volume dropped {Math.abs(volumeChangePct)}% — consider a deload week
              </p>
            ) : volumeChangePct >= 15 ? (
              <p className="text-xs font-semibold text-primary-dark bg-primary-pale rounded-full px-3 py-1.5 mt-3 inline-block">
                Volume is up {volumeChangePct}% vs your recent average — trending well
              </p>
            ) : null}
          </>
        )}
      </Card>


      <Card className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-teal-pale flex items-center justify-center shrink-0">
            <Dumbbell size={16} className="text-teal-dark" />
          </div>
          <div>
            <p className="text-sm font-bold text-charcoal">{prCount} tracked</p>
            <p className="text-[11px] text-charcoal-faint">Strength · One Rep Maxes</p>
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setOneRmOpen(true)}>
          View
        </Button>
      </Card>

      {totalSets > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">Balance</p>
            <Scale3D size={14} className="text-primary" />
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden mb-2.5">
            {sortedGroups.map(([group, count]) => (
              <div
                key={group}
                style={{ width: `${(count / totalSets) * 100}%`, background: balanceColors[group] ?? "#B8AFC8" }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1">
            {sortedGroups.slice(0, 4).map(([group, count]) => (
              <span key={group} className="flex items-center gap-1 text-[11px] text-charcoal-faint">
                <span className="w-2 h-2 rounded-full" style={{ background: balanceColors[group] ?? "#B8AFC8" }} />
                {group.replace(/_/g, " ")} · {Math.round((count / totalSets) * 100)}%
              </span>
            ))}
          </div>
          {dominantShare > 0.45 && (
            <p className="text-xs font-semibold text-status-caution bg-status-caution-bg rounded-full px-3 py-1.5 mt-2 inline-block">
              {topGroup![0].replace(/_/g, " ")} is {Math.round(dominantShare * 100)}% of recent sets — other
              muscle groups may be falling behind
            </p>
          )}
          <button onClick={() => setBalanceOpen(true)} className="tap text-xs font-semibold text-primary mt-3 block">
            View full breakdown
          </button>
        </Card>
      )}

      {workoutStreak && (
        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
              <Flame size={16} className="text-primary-dark" />
            </div>
            <div>
              <p className="text-sm font-bold text-charcoal">
                {/* An auto streak has no goal to count toward, so it states
                    the run instead of a fraction with nothing under it. */}
                {workoutStreak.goalDays
                  ? `${workoutStreak.days} / ${workoutStreak.goalDays} days`
                  : `${workoutStreak.days} days`}
              </p>
              <p className="text-[11px] text-charcoal-faint">Adherence · from your Workout streak</p>
            </div>
          </div>
          {workoutStreak.days === 0 && (
            <span className="text-[11px] font-semibold text-status-caution">Log a session to restart</span>
          )}
        </Card>
      )}

      {weightSeries.length >= 2 && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">Body composition</p>
            <Scale size={14} className="text-primary" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-charcoal">{weightSeries[weightSeries.length - 1]} kg</p>
              <p className="text-xs text-charcoal-faint">Weight trend (smoothed)</p>
            </div>
            <Sparkline values={weightSeries} color="#6F9993" width={140} height={44} />
          </div>
        </Card>
      )}

      <p className="text-[11px] text-charcoal-faint text-center">
        More statistics — like session-frequency heatmaps — are coming to this prototype.
      </p>

      <OneRepMaxesSheet open={oneRmOpen} onClose={() => setOneRmOpen(false)} />

      <BottomSheet open={balanceOpen} onClose={() => setBalanceOpen(false)} title="Training balance">
        <div className="space-y-2.5 animate-fade-slide-up">
          <p className="text-xs text-charcoal-faint mb-1">Completed sets by primary muscle group, all time.</p>
          {sortedGroups.map(([group, count]) => (
            <div key={group} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-charcoal">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: balanceColors[group] ?? "#B8AFC8" }} />
                {group.replace(/_/g, " ")}
              </span>
              <span className="text-sm font-semibold text-charcoal-soft">
                {count} sets · {Math.round((count / totalSets) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
