import React from "react";
import { OnboardingShell } from "./OnboardingShell";
import { Button } from "../../components/ui/Button";
import type { OnboardingDraft } from "./Onboarding";
import type { Goal } from "../../types";
import clsx from "clsx";
import { Check } from "lucide-react";

interface Props {
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  onNext: () => void;
  onBack: () => void;
}

const goals: { value: Goal; label: string; emoji: string }[] = [
  { value: "lose_weight", label: "Lose weight", emoji: "⚖️" },
  { value: "build_muscle", label: "Build muscle", emoji: "💪" },
  { value: "get_stronger", label: "Get stronger", emoji: "🏋️" },
  { value: "improve_nutrition", label: "Improve my nutrition", emoji: "🥗" },
  { value: "improve_fitness", label: "Improve my fitness", emoji: "🏃" },
  { value: "improve_health", label: "Improve my overall health", emoji: "❤️" },
  { value: "track_health", label: "Track my health", emoji: "📊" },
  { value: "live_healthier", label: "Live healthier", emoji: "🌿" },
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
              <span className="text-2xl mb-2 block">{g.emoji}</span>
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
