import React from "react";
import { OnboardingShell } from "./OnboardingShell";
import { Button } from "../../components/ui/Button";
import type { OnboardingDraft } from "./Onboarding";
import type { TrackPreference } from "../../types";
import clsx from "clsx";
import { Check, Utensils, Dumbbell, Scale, Footprints, Moon, TestTube, CheckSquare, Ruler } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Props {
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  onNext: () => void;
  onBack: () => void;
}

// V5 (QA 5.0): minimalistic icons instead of emoji, matching the Client UI's
// existing icon system (see utils/icons.tsx).
const options: { value: TrackPreference; label: string; icon: LucideIcon }[] = [
  { value: "nutrition", label: "Nutrition", icon: Utensils },
  { value: "workouts", label: "Workouts", icon: Dumbbell },
  { value: "weight", label: "Weight", icon: Scale },
  { value: "steps", label: "Steps", icon: Footprints },
  { value: "sleep", label: "Sleep", icon: Moon },
  { value: "bloodwork", label: "Blood work", icon: TestTube },
  { value: "habits", label: "Habits", icon: CheckSquare },
  { value: "body_composition", label: "Body composition", icon: Ruler },
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
              <o.icon size={22} className={clsx("mb-2", active ? "text-sohati-dark" : "text-charcoal-soft")} />
              <span className="text-sm font-semibold text-charcoal">{o.label}</span>
            </button>
          );
        })}
      </div>
    </OnboardingShell>
  );
};
