import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Card } from "../../components/ui/Card";
import { previousWorkouts } from "../../data/mockWorkouts";
import { formatDuration } from "../../services/workout";
import { WorkoutCalendarSheet } from "../../components/workout/WorkoutCalendarSheet";
import { ChevronDown, ChevronUp, Calendar, BarChart3, Clock } from "lucide-react";
import type { WorkoutSession } from "../../types";

// V8 (QA 8.0): "say that the client lifted the equivalent of a certain
// animal or object of that similar weight" — picks whichever reference is
// closest in weight to the total volume lifted, not just the nearest one
// below it, so a small total still gets a sensible (small) comparison.
const weightComparisons: { weight: number; label: string; emoji: string }[] = [
  { weight: 4, label: "a housecat", emoji: "🐱" },
  { weight: 30, label: "a Labrador", emoji: "🐕" },
  { weight: 70, label: "an adult human", emoji: "🧍" },
  { weight: 200, label: "a grand piano", emoji: "🎹" },
  { weight: 380, label: "a grizzly bear", emoji: "🐻" },
  { weight: 900, label: "a motorbike", emoji: "🏍️" },
  { weight: 1500, label: "a small car", emoji: "🚗" },
  { weight: 5400, label: "an elephant", emoji: "🐘" },
  { weight: 12000, label: "a school bus", emoji: "🚌" },
  { weight: 180000, label: "a blue whale", emoji: "🐋" },
];

function closestComparison(totalKg: number) {
  return weightComparisons.reduce((best, c) =>
    Math.abs(c.weight - totalKg) < Math.abs(best.weight - totalKg) ? c : best
  );
}

export default function HistoryTab() {
  const { workoutSessions } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [previousExpandedId, setPreviousExpandedId] = useState<string | null>(null);

  const totalVolume = workoutSessions.reduce((s, w) => s + w.totalVolumeKg, 0);
  const totalSeconds = workoutSessions.reduce((s, w) => s + w.durationSec, 0);
  const comparison = totalVolume > 0 ? closestComparison(totalVolume) : null;

  return (
    <div className="animate-fade-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">
          Summary
        </p>
        <button
          onClick={() => setCalendarOpen(true)}
          aria-label="Workout calendar"
          className="tap w-8 h-8 rounded-full bg-cream-card flex items-center justify-center text-charcoal-soft shadow-soft"
        >
          <Calendar size={15} />
        </button>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
              <BarChart3 size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-charcoal">{totalVolume.toLocaleString()} kg</p>
              <p className="text-[11px] text-charcoal-faint">Total volume</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-pale flex items-center justify-center shrink-0">
              <Clock size={16} className="text-sky" />
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-charcoal">{formatDuration(totalSeconds)}</p>
              <p className="text-[11px] text-charcoal-faint">Time taken</p>
            </div>
          </div>
        </div>
        {comparison && (
          <p className="text-center text-xs text-charcoal-soft border-t border-charcoal/[0.06] pt-3">
            That's the equivalent of lifting {comparison.emoji} {comparison.label}
          </p>
        )}
      </Card>

      {workoutSessions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
            Logged sessions
          </p>
          <div className="space-y-2.5">
            {[...workoutSessions].reverse().map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                expanded={expandedId === s.id}
                onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
          Previous workouts
        </p>
        <div className="space-y-2.5">
          {previousWorkouts.map((w) => {
            const open = previousExpandedId === w.id;
            return (
              <Card key={w.id} padded={false} className="overflow-hidden">
                <button
                  onClick={() => setPreviousExpandedId(open ? null : w.id)}
                  className="tap w-full flex items-center justify-between p-4 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-charcoal">{w.name}</p>
                    <p className="text-xs text-charcoal-faint">
                      {w.date} · {w.exerciseCount} exercises
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-charcoal-faint">{w.durationMin}m</span>
                    {open ? (
                      <ChevronUp size={15} className="text-charcoal-faint" />
                    ) : (
                      <ChevronDown size={15} className="text-charcoal-faint" />
                    )}
                  </div>
                </button>
                {open && (
                  <div className="border-t border-charcoal/[0.06] px-4 py-3 animate-fade-slide-up">
                    <div className="flex flex-wrap gap-1.5">
                      {w.exercises.map((name) => (
                        <span key={name} className="text-xs font-medium text-charcoal bg-cream-soft rounded-full px-2.5 py-1">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <WorkoutCalendarSheet open={calendarOpen} onClose={() => setCalendarOpen(false)} />
    </div>
  );
}

// V8 (QA 8.0): "Logged sessions should have completion date alongside
// total time taken and total volume" + "Remove the ability to add a note
// in the logged sessions and instead show notes written during the routine
// previously" — per-set notes come from SetOptionsSheet, captured live
// during the workout, not a free-text box added after the fact here.
const SessionRow: React.FC<{
  session: WorkoutSession;
  expanded: boolean;
  onToggle: () => void;
}> = ({ session, expanded, onToggle }) => {
  const completionDate = new Date(`${session.date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <Card padded={false} className="overflow-hidden">
      <button onClick={onToggle} className="tap w-full flex items-center justify-between p-4 text-left">
        <div>
          <p className="text-sm font-semibold text-charcoal">{session.routineName}</p>
          <p className="text-xs text-charcoal-faint">
            {completionDate} · {formatDuration(session.durationSec)} · {session.totalVolumeKg.toLocaleString()} kg volume
          </p>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-charcoal-faint shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-charcoal-faint shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-charcoal/[0.06] px-4 py-3 animate-fade-slide-up">
          <div className="divide-y divide-charcoal/[0.04]">
            {session.exercises.map((ex) => (
              <div key={ex.exerciseId} className="py-2">
                <p className="text-sm font-medium text-charcoal mb-1">{ex.name}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1">
                  {ex.sets.map((s, i) => (
                    <span key={i} className="text-[11px] text-charcoal-faint">
                      {s.weightKg}kg × {s.reps}
                      {s.completed ? "" : " (skipped)"}
                    </span>
                  ))}
                </div>
                {ex.sets.some((s) => s.notes) && (
                  <div className="space-y-0.5">
                    {ex.sets
                      .filter((s) => s.notes)
                      .map((s, i) => (
                        <p key={i} className="text-[11px] text-charcoal-soft italic">
                          Set {s.setNumber}: "{s.notes}"
                        </p>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
