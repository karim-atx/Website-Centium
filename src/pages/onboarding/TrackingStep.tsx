import React from "react";
import { OnboardingShell } from "./OnboardingShell";
import { Button } from "../../components/ui/Button";
import type { OnboardingDraft } from "./Onboarding";
import type { TrackPreference } from "../../types";
import clsx from "clsx";
import { Check } from "lucide-react";

interface Props {
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  onNext: () => void;
  onBack: () => void;
}

const options: { value: TrackPreference; label: string; emoji: string }[] = [
  { value: "nutrition", label: "Nutrition", emoji: "🍽️" },
  { value: "workouts", label: "Workouts", emoji: "🏋️" },
  { value: "weight", label: "Weight", emoji: "⚖️" },
  { value: "steps", label: "Steps", emoji: "👣" },
  { value: "sleep", label: "Sleep", emoji: "😴" },
  { value: "bloodwork", label: "Blood work", emoji: "🩸" },
  { value: "habits", label: "Habits", emoji: "✅" },
  { value: "body_composition", label: "Body composition", emoji: "📏" },
];

export const TrackingStep: React.FC<Props> = ({ draft, setDraft, onNext, onBack }) => {
  const toggle = (v: TrackPreference) =>
    setDraft((d) => ({
      ...d,
      tracking: d.tracking.includes(v) ? d.tracking.filter((x) => x !== v) : [...d.tracking, v],
    }));

  return (
    <OnboardingShell
      title="What do you want to track?"
      subtitle="You can always change this later."
      onBack={onBack}
      footer={
        <Button fullWidth size="lg" disabled={draft.tracking.length === 0} onClick={onNext}>
          Continue
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {options.map((o) => {
          const active = draft.tracking.includes(o.value);
          return (
            <button
              key={o.value}
              onClick={() => toggle(o.value)}
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
              <span className="text-2xl mb-2 block">{o.emoji}</span>
              <span className="text-sm font-semibold text-charcoal">{o.label}</span>
            </button>
          );
        })}
      </div>
    </OnboardingShell>
  );
};
