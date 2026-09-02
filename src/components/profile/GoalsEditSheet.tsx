import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import type { Goal } from "../../types";
import clsx from "clsx";
import { Check, Scale, Dumbbell, TrendingUp, Salad, Activity, HeartPulse, BarChart3, Leaf } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// V8 (QA 8.0): "Replace the goals emoji with that of the 'what are you
// working towards?' logos found in the Client UI onboarding" — same icon
// set as GoalStep.tsx's own list, one-to-one by goal value.
const goals: { value: Goal; label: string; icon: LucideIcon }[] = [
  { value: "lose_weight", label: "Lose weight", icon: Scale },
  { value: "build_muscle", label: "Build muscle", icon: Dumbbell },
  { value: "get_stronger", label: "Get stronger", icon: TrendingUp },
  { value: "improve_nutrition", label: "Improve my nutrition", icon: Salad },
  { value: "improve_fitness", label: "Improve my fitness", icon: Activity },
  { value: "improve_health", label: "Improve my overall health", icon: HeartPulse },
  { value: "track_health", label: "Track my health", icon: BarChart3 },
  { value: "live_healthier", label: "Live healthier", icon: Leaf },
];

// QA 13.0: "Changing goals and activity while the recovery sensitive
// experience is turned on should use the goals in onboarding adapted to
// recovery sensitive experience" — same `triggeringGoals` filter as
// GoalStep.tsx's onboarding step, so editing goals later stays consistent
// with what recovery-sensitive users saw at sign-up.
const triggeringGoals: Goal[] = ["lose_weight"];

export const GoalsEditSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user, updateProfile, recoverySensitive } = useApp();
  const [selected, setSelected] = useState<Goal[]>(user.goals);

  useEffect(() => {
    if (open) setSelected(user.goals);
  }, [open, user.goals]);

  const toggle = (g: Goal) =>
    setSelected((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const save = () => {
    updateProfile({ goals: selected.length ? selected : user.goals });
    onClose();
  };

  const visibleGoals = recoverySensitive ? goals.filter((g) => !triggeringGoals.includes(g.value)) : goals;

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit Goals">
      <div className="grid grid-cols-2 gap-3 mb-5 animate-fade-slide-up">
        {visibleGoals.map((g) => {
          const active = selected.includes(g.value);
          return (
            <button
              key={g.value}
              onClick={() => toggle(g.value)}
              className={clsx(
                "tap relative text-left rounded-2xl p-4 border transition-colors",
                active ? "bg-primary-pale border-primary" : "bg-cream-soft border-transparent"
              )}
            >
              {active && (
                <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              )}
              <g.icon size={22} className={clsx("mb-2", active ? "text-primary-dark" : "text-charcoal-soft")} />
              <span className="text-xs font-semibold text-charcoal leading-snug block">{g.label}</span>
            </button>
          );
        })}
      </div>
      <Button fullWidth size="lg" onClick={save} disabled={selected.length === 0}>
        Save goals
      </Button>
    </BottomSheet>
  );
};
