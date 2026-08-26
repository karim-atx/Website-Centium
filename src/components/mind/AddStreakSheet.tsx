import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { Flame } from "lucide-react";
import { habitIcon } from "../../utils/icons";
import clsx from "clsx";

// V4 (QA 4.0): a new streak must be linked to an existing habit — its day
// count then tracks that habit's own streakDays automatically, instead of
// being a free-standing counter with a hand-typed label.
export const AddStreakSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { habits, streaks, addStreak } = useApp();
  const [habitId, setHabitId] = useState<string | null>(null);
  const [goalDays, setGoalDays] = useState("30");

  const linkedHabitIds = new Set(streaks.map((s) => s.habitId).filter(Boolean));
  const availableHabits = habits.filter((h) => !linkedHabitIds.has(h.id));

  const reset = () => {
    setHabitId(null);
    setGoalDays("30");
  };

  const save = () => {
    if (!habitId) return;
    addStreak(habitId, Number(goalDays) || 30);
    reset();
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="New Streak"
    >
      <div className="space-y-5 animate-fade-slide-up">
        <div className="flex items-center gap-2 text-teal">
          <Flame size={22} />
          <span className="text-xs text-charcoal-faint">Every streak uses this icon</span>
        </div>

        <div>
          <span className="text-xs font-semibold text-charcoal-soft mb-2 block">
            Link to a habit — its streak carries over automatically
          </span>
          {availableHabits.length > 0 ? (
            <div className="space-y-1.5">
              {availableHabits.map((h) => {
                const Icon = habitIcon[h.icon];
                const active = habitId === h.id;
                return (
                  <button
                    key={h.id}
                    onClick={() => setHabitId(h.id)}
                    className={clsx(
                      "tap w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left border transition-colors",
                      active ? "bg-primary-pale border-primary" : "bg-cream-soft border-transparent"
                    )}
                  >
                    <span className="w-7 h-7 rounded-lg bg-cream-card flex items-center justify-center shrink-0">
                      <Icon size={14} className="text-primary-dark" />
                    </span>
                    <span className="text-sm font-semibold text-charcoal flex-1">{h.label}</span>
                    {h.streakDays > 0 && (
                      <span className="text-[11px] font-bold text-teal-dark">{h.streakDays}d</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-charcoal-faint">
              {habits.length === 0
                ? "Add a habit in the Habits tab first, then come back to turn it into a streak."
                : "Every habit already has a streak."}
            </p>
          )}
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Goal (days)</span>
          <input
            value={goalDays}
            onChange={(e) => setGoalDays(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <Button fullWidth size="lg" onClick={save} disabled={!habitId}>
          Add streak
        </Button>
      </div>
    </BottomSheet>
  );
};
