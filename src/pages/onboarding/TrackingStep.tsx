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

// QA 12.0: "when chosen, the what do want to track page removes all
// options that might be triggering to someone with an eating disorder" —
// weight and body-composition tracking are the two directly
// number-on-the-body concepts; nutrition/workouts/steps/sleep/etc. stay
// available since the Diary itself later switches to neutral, non-numeric
// logging under the recovery-sensitive experience rather than disappearing.
const triggeringOptions: TrackPreference[] = ["weight", "body_composition"];

// QA 13.0: "Nutiriton still appears which might be triggering, replace with
// something that abides by the recovery sensitive principals." The value
// stays "nutrition" (Food diary logging still works the same either way),
// but under recovery-sensitive mode it's presented as gentler meal-noticing
// rather than a numbers-forward nutrition tracker.
const recoverySensitiveLabel: Partial<Record<TrackPreference, string>> = {
  nutrition: "Meals & eating patterns",
};

export const TrackingStep: React.FC<Props> = ({ draft, setDraft, onNext, onBack }) => {
  const toggle = (v: TrackPreference) =>
    setDraft((d) => ({
      ...d,
      tracking: d.tracking.includes(v) ? d.tracking.filter((x) => x !== v) : [...d.tracking, v],
    }));

  const visibleOptions = draft.recoverySensitive
    ? options
        .filter((o) => !triggeringOptions.includes(o.value))
        .map((o) => ({ ...o, label: recoverySensitiveLabel[o.value] ?? o.label }))
    : options;

  return (
    <OnboardingShell
      title="What do you want to track?"
      subtitle="You can always change this later."
      onBack={onBack}
      // QA 11.0: "You should be able to skip what do want to track as
      // well" — matches GoalStep's existing skip pattern instead of
      // blocking progress on zero selections.
      footer={
        <Button fullWidth size="lg" onClick={onNext}>
          {draft.tracking.length === 0 ? "Skip" : "Continue"}
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {visibleOptions.map((o) => {
          const active = draft.tracking.includes(o.value);
          return (
            <button
              key={o.value}
              onClick={() => toggle(o.value)}
              className={clsx(
                "tap relative text-left rounded-2xl p-4 border transition-colors",
                active ? "bg-primary-pale border-primary" : "bg-cream-card border-charcoal/10"
              )}
            >
              {active && (
                <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              )}
              <o.icon size={22} className={clsx("mb-2", active ? "text-primary-dark" : "text-charcoal-soft")} />
              <span className="text-sm font-semibold text-charcoal">{o.label}</span>
            </button>
          );
        })}
      </div>
    </OnboardingShell>
  );
};
