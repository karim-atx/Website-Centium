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

// QA 13.0: "Please fix the 'what are you working towards' tab accordingly to
// abiding by the recovery sensitive principals" — mirrors TrackingStep's
// existing `triggeringOptions` pattern. "Lose weight" is the one
// number/appearance-focused goal here, so it's hidden once recovery-sensitive
// mode is on (chosen one step earlier now, see Onboarding.tsx step order).
const triggeringGoals: Goal[] = ["lose_weight"];

export const GoalStep: React.FC<Props> = ({ draft, setDraft, onNext, onBack }) => {
  const toggle = (g: Goal) =>
    setDraft((d) => ({
      ...d,
      goals: d.goals.includes(g) ? d.goals.filter((x) => x !== g) : [...d.goals, g],
    }));

  const visibleGoals = draft.recoverySensitive
    ? goals.filter((g) => !triggeringGoals.includes(g.value))
    : goals;

  return (
    <OnboardingShell
      title="What are you working toward?"
      subtitle="Pick as many as you like."
      onBack={onBack}
      footer={
        <div>
          <Button fullWidth size="lg" onClick={onNext}>
            {draft.goals.length === 0 ? "Skip" : "Continue"}
          </Button>
          <p className="text-[11px] font-medium text-charcoal-tertiary text-center mt-3.5">
            {draft.goals.length} of {visibleGoals.length} selected
          </p>
        </div>
      }
    >
      {/* Design refinement §6/2c "Onboarding · Goals": "Selection is now a
          filled lavender tile rather than a pale tint plus a floating tick,
          so the choice reads at a glance." */}
      <div className="grid grid-cols-2 gap-[11px]">
        {visibleGoals.map((g) => {
          const active = draft.goals.includes(g.value);
          return (
            <button
              key={g.value}
              onClick={() => toggle(g.value)}
              className={clsx(
                "tap relative text-left rounded-[18px] p-4 border transition-colors",
                active ? "bg-primary border-primary" : "bg-cream-card border-charcoal/[0.11]"
              )}
            >
              {active && (
                <div className="absolute top-[11px] right-[11px] w-[19px] h-[19px] rounded-full bg-white flex items-center justify-center">
                  <Check size={11} className="text-primary-dark" strokeWidth={3} />
                </div>
              )}
              <g.icon size={22} className={clsx("mb-[22px]", active ? "text-white" : "text-charcoal-faint")} />
              <span className={clsx("text-[13.5px] leading-snug block", active ? "font-bold text-white" : "font-semibold text-charcoal")}>
                {g.label}
              </span>
            </button>
          );
        })}
      </div>
    </OnboardingShell>
  );
};
