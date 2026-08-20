import React, { useEffect, useMemo, useState } from "react";
import { X, Plus, Check, Calculator, Square } from "lucide-react";
import type { Exercise, LoggedExercise, LoggedSet } from "../../types";
import { useApp } from "../../context/AppContext";
import { Metronome } from "./Metronome";
import { RPECalculator } from "./RPECalculator";
import { Button } from "../ui/Button";
import { formatDuration, volumeForSession } from "../../services/workout";

function initLoggedExercises(exercises: Exercise[]): LoggedExercise[] {
  return exercises.map((ex) => ({
    exerciseId: ex.id,
    name: ex.name,
    sets: Array.from({ length: ex.sets }).map((_, i) => ({
      setNumber: i + 1,
      reps: ex.reps,
      weightKg: ex.weightKg,
      completed: false,
    })),
  }));
}

export const WorkoutSessionSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  routineId: string | null;
  routineName: string;
  exercises: Exercise[];
}> = ({ open, onClose, routineId, routineName, exercises }) => {
  const { saveWorkoutSession, logWorkout } = useApp();
  const [startedAt] = useState(() => new Date());
  const [elapsed, setElapsed] = useState(0);
  const [logged, setLogged] = useState<LoggedExercise[]>(() => initLoggedExercises(exercises));
  const [rpeOpen, setRpeOpen] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!open || finished) return;
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [open, finished]);

  useEffect(() => {
    if (open) {
      setLogged(initLoggedExercises(exercises));
      setElapsed(0);
      setFinished(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, routineId]);

  const totalVolume = useMemo(() => volumeForSession(logged), [logged]);

  if (!open) return null;

  const updateSet = (exIdx: number, setIdx: number, patch: Partial<LoggedSet>) => {
    setLogged((prev) => {
      const next = [...prev];
      const sets = [...next[exIdx].sets];
      sets[setIdx] = { ...sets[setIdx], ...patch };
      next[exIdx] = { ...next[exIdx], sets };
      return next;
    });
  };

  const addSet = (exIdx: number) => {
    setLogged((prev) => {
      const next = [...prev];
      const sets = next[exIdx].sets;
      const last = sets[sets.length - 1];
      next[exIdx] = {
        ...next[exIdx],
        sets: [
          ...sets,
          { setNumber: sets.length + 1, reps: last?.reps ?? 8, weightKg: last?.weightKg ?? 0, completed: false },
        ],
      };
      return next;
    });
  };

  const finishWorkout = () => {
    const endedAt = new Date();
    saveWorkoutSession({
      routineId,
      routineName,
      date: "2026-08-20",
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationSec: elapsed,
      totalVolumeKg: totalVolume,
      exercises: logged,
    });
    logWorkout({
      workoutId: routineId ?? "custom",
      workoutName: routineName,
      durationMin: Math.max(1, Math.round(elapsed / 60)),
      completed: true,
      exercises,
    });
    setFinished(true);
    setTimeout(onClose, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-cream flex flex-col animate-fade-in">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-charcoal/5 shrink-0">
        <button
          onClick={onClose}
          className="tap w-9 h-9 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft"
        >
          <X size={16} />
        </button>
        <div className="text-center">
          <p className="font-display font-semibold text-charcoal">{routineName}</p>
          <p className="text-xs text-charcoal-faint">
            Started {startedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {formatDuration(elapsed)} elapsed
          </p>
        </div>
        <Metronome />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {logged.map((ex, exIdx) => (
          <div key={ex.exerciseId} className="mb-6">
            <p className="font-semibold text-charcoal mb-2">{ex.name}</p>
            <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-1.5 px-1">
              <span>Set</span>
              <span>Weight (kg)</span>
              <span>Reps</span>
              <span></span>
            </div>
            <div className="space-y-1.5">
              {ex.sets.map((s, setIdx) => (
                <div
                  key={setIdx}
                  className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center bg-cream-card rounded-xl px-3 py-2 shadow-soft"
                >
                  <span className="text-sm font-bold text-charcoal-faint w-5">{s.setNumber}</span>
                  <input
                    value={s.weightKg}
                    onChange={(e) => updateSet(exIdx, setIdx, { weightKg: Number(e.target.value) || 0 })}
                    inputMode="decimal"
                    className="w-full rounded-lg bg-cream-soft px-2 py-1.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
                  />
                  <input
                    value={s.reps}
                    onChange={(e) => updateSet(exIdx, setIdx, { reps: Number(e.target.value) || 0 })}
                    inputMode="numeric"
                    className="w-full rounded-lg bg-cream-soft px-2 py-1.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
                  />
                  <button
                    onClick={() => updateSet(exIdx, setIdx, { completed: !s.completed })}
                    className={`tap w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      s.completed ? "bg-sohati text-white" : "bg-cream-soft text-charcoal-faint"
                    }`}
                  >
                    <Check size={13} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => addSet(exIdx)}
              className="tap flex items-center gap-1.5 text-xs font-semibold text-sohati mt-2"
            >
              <Plus size={12} /> Add set
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-charcoal/5 px-5 py-4 shrink-0 bg-cream-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-charcoal-faint">Total volume</p>
            <p className="text-lg font-bold text-charcoal">{totalVolume.toLocaleString()} kg</p>
          </div>
          <button
            onClick={() => setRpeOpen(true)}
            className="tap flex items-center gap-1.5 text-xs font-semibold text-charcoal-soft bg-cream-soft rounded-full px-3 py-2"
          >
            <Calculator size={13} /> RPE calc
          </button>
        </div>
        <Button fullWidth size="lg" onClick={finishWorkout} disabled={finished}>
          {finished ? (
            "Workout Saved ✓"
          ) : (
            <>
              <Square size={14} /> Finish Workout
            </>
          )}
        </Button>
      </div>

      <RPECalculator open={rpeOpen} onClose={() => setRpeOpen(false)} />
    </div>
  );
};
