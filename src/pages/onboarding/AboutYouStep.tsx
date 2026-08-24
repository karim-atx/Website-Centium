import React from "react";
import { OnboardingShell } from "./OnboardingShell";
import { Button } from "../../components/ui/Button";
import type { OnboardingDraft } from "./Onboarding";
import type { Sex } from "../../types";
import clsx from "clsx";

interface Props {
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  onNext: () => void;
  onBack: () => void;
}

const sexOptions: { value: Sex; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

export const AboutYouStep: React.FC<Props> = ({ draft, setDraft, onNext, onBack }) => {
  const canContinue = draft.firstName.trim().length > 0;

  const isProfessional = draft.accountType === "professional";

  return (
    <OnboardingShell
      title="About you"
      subtitle={
        isProfessional
          ? "Sets up your own Sohati profile — you'll add clients next."
          : "This helps us personalize your targets."
      }
      onBack={onBack}
      footer={
        <Button fullWidth size="lg" disabled={!canContinue} onClick={onNext}>
          Continue
        </Button>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">First name</span>
          <input
            value={draft.firstName}
            onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
            placeholder="Abdallah"
            className="w-full rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-sohati/50 focus:ring-2 focus:ring-sohati/10"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Age</span>
            <input
              value={draft.age}
              onChange={(e) => setDraft((d) => ({ ...d, age: e.target.value.replace(/\D/g, "") }))}
              placeholder="29"
              inputMode="numeric"
              className="w-full rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-sohati/50 focus:ring-2 focus:ring-sohati/10"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Height (cm)</span>
            <input
              value={draft.heightCm}
              onChange={(e) =>
                setDraft((d) => ({ ...d, heightCm: e.target.value.replace(/\D/g, "") }))
              }
              placeholder="178"
              inputMode="numeric"
              className="w-full rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-sohati/50 focus:ring-2 focus:ring-sohati/10"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Weight (kg)</span>
          <input
            value={draft.weightKg}
            onChange={(e) => setDraft((d) => ({ ...d, weightKg: e.target.value.replace(/[^\d.]/g, "") }))}
            placeholder="106.4"
            inputMode="decimal"
            className="w-full rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-sohati/50 focus:ring-2 focus:ring-sohati/10"
          />
        </label>

        <div>
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Sex</span>
          <div className="grid grid-cols-3 gap-2">
            {sexOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDraft((d) => ({ ...d, sex: opt.value }))}
                className={clsx(
                  "tap rounded-2xl py-3 text-sm font-semibold border transition-colors",
                  draft.sex === opt.value
                    ? "bg-sohati text-white border-sohati"
                    : "bg-cream-card text-charcoal-soft border-charcoal/10"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
};
