import React from "react";
import { OnboardingShell } from "./OnboardingShell";
import { Button } from "../../components/ui/Button";
import type { OnboardingDraft } from "./Onboarding";
import type { ActivityLevel } from "../../types";
import clsx from "clsx";

interface Props {
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  onNext: () => void;
  onBack: () => void;
}

const levels: { value: ActivityLevel; label: string; desc: string; emoji: string }[] = [
  { value: "sedentary", label: "Sedentary", desc: "Little to no exercise", emoji: "🪑" },
  { value: "light", label: "Lightly active", desc: "1–3 workouts a week", emoji: "🚶" },
  { value: "moderate", label: "Moderately active", desc: "3–5 workouts a week", emoji: "🚴" },
  { value: "very_active", label: "Very active", desc: "6–7 workouts a week", emoji: "🏃" },
  { value: "athlete", label: "Athlete", desc: "Structured training daily", emoji: "🏆" },
];

export const ActivityStep: React.FC<Props> = ({ draft, setDraft, onNext, onBack }) => {
  return (
    <OnboardingShell
      title="How active are you?"
      subtitle="We'll use this to set realistic targets."
      onBack={onBack}
      footer={
        <Button fullWidth size="lg" disabled={!draft.activityLevel} onClick={onNext}>
          Continue
        </Button>
      }
    >
      <div className="space-y-2.5">
        {levels.map((l) => {
          const active = draft.activityLevel === l.value;
          return (
            <button
              key={l.value}
              onClick={() => setDraft((d) => ({ ...d, activityLevel: l.value }))}
              className={clsx(
                "tap w-full flex items-center gap-3.5 text-left rounded-2xl p-4 border transition-colors",
                active ? "bg-sohati-pale border-sohati" : "bg-cream-card border-charcoal/10"
              )}
            >
              <span className="text-2xl">{l.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-charcoal">{l.label}</p>
                <p className="text-xs text-charcoal-soft">{l.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </OnboardingShell>
  );
};
