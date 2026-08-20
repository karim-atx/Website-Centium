import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { todaysWorkout } from "../../data/mockWorkouts";
import { useApp } from "../../context/AppContext";
import { Check, Circle } from "lucide-react";

export const LogWorkoutSheet: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { logWorkout } = useApp();
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState(false);

  const toggle = (id: string) =>
    setDoneIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const finish = () => {
    logWorkout({
      workoutId: todaysWorkout.id,
      workoutName: todaysWorkout.name,
      durationMin: todaysWorkout.durationMin,
      completed: true,
      exercises: todaysWorkout.exercises,
    });
    setFinished(true);
    setTimeout(() => {
      setFinished(false);
      setDoneIds(new Set());
      onClose();
    }, 900);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Log Workout">
      <div className="animate-fade-slide-up">
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-1">
          Today's workout
        </p>
        <p className="font-display text-xl font-semibold text-charcoal mb-4">{todaysWorkout.name}</p>

        <div className="space-y-2 mb-6">
          {todaysWorkout.exercises.map((ex) => {
            const done = doneIds.has(ex.id);
            return (
              <button
                key={ex.id}
                onClick={() => toggle(ex.id)}
                className={`tap w-full flex items-center justify-between rounded-2xl px-4 py-3 border transition-colors ${
                  done ? "bg-sohati-pale border-sohati" : "bg-cream-soft border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  {done ? (
                    <Check size={18} className="text-sohati" />
                  ) : (
                    <Circle size={18} className="text-charcoal-faint" />
                  )}
                  <div className="text-left">
                    <p className="text-sm font-semibold text-charcoal">{ex.name}</p>
                    <p className="text-xs text-charcoal-faint">
                      {ex.sets} × {ex.reps} · {ex.weightKg}kg
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Button fullWidth size="lg" onClick={finish} disabled={finished}>
          {finished ? "Workout Saved ✓" : "Finish Workout"}
        </Button>
      </div>
    </BottomSheet>
  );
};
