import { useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Sparkline } from "../../components/health/Sparkline";
import { OneRepMaxesSheet } from "../../components/workout/OneRepMaxesSheet";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { exerciseLibrary } from "../../data/mockWorkouts";
import { TrendingUp, Dumbbell, Scale3D, Flame, Scale } from "lucide-react";

// QA 12.0: "Rework the metrics tab... Limiting the default view to 3-5
// primary metrics (rather than overwhelming users with everything at
// once)... deeper analytics available via drill-down." The reference
// table's 6 categories (Strength/Volume/Balance/Recovery/Adherence/Body
// composition) collapse into 4 cards here — Recovery folds into Adherence
// since this prototype's only real "did they show up" signal is the
// workout streak, which is also the explicit "Adherence should be
// connected to the streaks tab" ask.
const seedVolumes = [4200, 4550, 4100, 4820, 5010, 4700];

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
  const { workoutSessions, personalRecords, streaks, weightByDate } = useApp();
  const [oneRmOpen, setOneRmOpen] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);

  const volumePoints = [...seedVolumes, ...workoutSessions.map((s) => s.totalVolumeKg)];
  const lastVolume = volumePoints[volumePoints.length - 1];
  const priorAvg =
    volumePoints.length > 1
      ? volumePoints.slice(0, -1).reduce((a, b) => a + b, 0) / (volumePoints.length - 1)
      : lastVolume;
  const volumeChangePct = priorAvg > 0 ? Math.round(((lastVolume - priorAvg) / priorAvg) * 100) : 0;
  const prCount = Object.keys(personalRecords).length;

  // "Balance": tally of sets per primary muscle group across every logged
  // exercise, cross-referenced against the exercise library (LoggedExercise
  // itself only stores a name, not its muscle groups).
  const muscleGroupTally = useMemo(() => {
    const tally: Record<string, number> = {};
    for (const session of workoutSessions) {
      for (const ex of session.exercises) {
        const libEntry = exerciseLibrary.find((l) => l.name === ex.name);
        const group = libEntry?.muscleGroups?.[0];
        if (!group) continue;
        tally[group] = (tally[group] ?? 0) + ex.sets.filter((s) => s.completed).length;
      }
    }
    return tally;
  }, [workoutSessions]);
  const totalSets = Object.values(muscleGroupTally).reduce((a, b) => a + b, 0);
  const sortedGroups = Object.entries(muscleGroupTally).sort((a, b) => b[1] - a[1]);
  const topGroup = sortedGroups[0];
  const dominantShare = topGroup && totalSets > 0 ? topGroup[1] / totalSets : 0;

  const workoutStreak = streaks.find((s) => s.id === "s3") ?? streaks.find((s) => /workout/i.test(s.label));

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
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-charcoal">{lastVolume.toLocaleString()} kg</p>
            <p className="text-xs text-charcoal-faint">Last logged session</p>
          </div>
          <Sparkline values={volumePoints} color="#7D6BB5" width={140} height={44} />
        </div>
        {/* QA 12.0: "Every visualization should ideally suggest a next
            action (e.g., 'volume dropped 15% — consider a deload')." */}
        {volumeChangePct <= -15 ? (
          <p className="text-xs font-semibold text-status-high bg-status-high-bg rounded-full px-3 py-1.5 mt-3 inline-block">
            Volume dropped {Math.abs(volumeChangePct)}% — consider a deload week
          </p>
        ) : volumeChangePct >= 15 ? (
          <p className="text-xs font-semibold text-primary-dark bg-primary-pale rounded-full px-3 py-1.5 mt-3 inline-block">
            Volume is up {volumeChangePct}% vs your recent average — trending well
          </p>
        ) : null}
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
                {workoutStreak.days} / {workoutStreak.goalDays} days
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
