import React from "react";
import { OnboardingShell } from "./OnboardingShell";
import { Button } from "../../components/ui/Button";
import type { OnboardingDraft } from "./Onboarding";
import type { Goal } from "../../types";
import clsx from "clsx";
import { Check, Scale, Dumbbell, TrendingUp, Salad, Activity, HeartPulse, BarChart3, Leaf } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Props {
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  onNext: () => void;
  onBack: () => void;
}

// V5 (QA 5.0): minimalistic icons instead of emoji, matching the Client UI's
// existing icon system (see utils/icons.tsx).
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

export const GoalStep: React.FC<Props> = ({ draft, setDraft, onNext, onBack }) => {
  const toggle = (g: Goal) =>
    setDraft((d) => ({
      ...d,
      goals: d.goals.includes(g) ? d.goals.filter((x) => x !== g) : [...d.goals, g],
    }));

  return (
    <OnboardingShell
      title="What are you working toward?"
      subtitle="Pick as many as you like."
      onBack={onBack}
      footer={
        <Button fullWidth size="lg" disabled={draft.goals.length === 0} onClick={onNext}>
          Continue
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {goals.map((g) => {
          const active = draft.goals.includes(g.value);
          return (
            <button
              key={g.value}
              onClick={() => toggle(g.value)}
              className={clsx(
                "tap relative text-left rounded-2xl p-4 border transition-colors",
                active ? "bg-sohati-pale border-sohati" : "bg-cream-card border-charcoal/10"
              )}
            >
              {active && (
                <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-sohati flex items-center justify-center">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              )}
              <g.icon size={22} className={clsx("mb-2", active ? "text-sohati-dark" : "text-charcoal-soft")} />
              <span className="text-sm font-semibold text-charcoal leading-snug block">
                {g.label}
              </span>
            </button>
          );
        })}
      </div>
    </OnboardingShell>
  );
};
