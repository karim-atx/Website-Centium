import React from "react";
import { OnboardingShell } from "./OnboardingShell";
import { Button } from "../../components/ui/Button";
import type { OnboardingDraft } from "./Onboarding";
import { HeartHandshake } from "lucide-react";
import clsx from "clsx";

interface Props {
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  onNext: () => void;
  onBack: () => void;
}

// QA 12.0: "Revamp the onboarding page to include the ability to ask if you
// are recovering from an eating disorder without being stigmatizing, when
// chosen, the what do want to track page removes all options that might be
// triggering." Framed as a private, low-pressure preference rather than a
// clinical yes/no — matches the later "Avoid calling it an 'ED toggle'...
// Do not make the user explain why they selected it" guidance from the same
// cycle, which applies just as much here at first ask as it does in
// Settings later.
export const RecoveryStep: React.FC<Props> = ({ draft, setDraft, onNext, onBack }) => {
  return (
    <OnboardingShell
      title="One more thing, privately"
      subtitle="This is just between you and the app — it only changes what we show you."
      onBack={onBack}
      footer={
        <Button fullWidth size="lg" onClick={onNext}>
          Continue
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-charcoal-soft leading-relaxed">
          Some people find calorie counts, weight numbers, or streaks unhelpful — or genuinely hard — for
          their relationship with food. If that's true for you right now, we can leave those out.
        </p>

        {/* QA 13.0: "have the button a bit away from the text as it appears
            too close" — an explicit top margin on the button itself, rather
            than relying on the shared `space-y-4` gap the surrounding
            paragraphs also use. */}
        <button
          onClick={() => setDraft((d) => ({ ...d, recoverySensitive: !d.recoverySensitive }))}
          className={clsx(
            "tap w-full text-left rounded-2xl p-4 border transition-colors flex items-start gap-3 mt-2",
            draft.recoverySensitive ? "bg-primary-pale border-primary" : "bg-cream-card border-charcoal/[0.11]"
          )}
        >
          <span
            className={clsx(
              "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
              draft.recoverySensitive ? "bg-primary text-white" : "bg-cream-soft text-charcoal-faint"
            )}
          >
            <HeartHandshake size={17} />
          </span>
          <span>
            <span className="text-sm font-bold text-charcoal block mb-0.5">
              Start with a gentler, recovery-sensitive experience
            </span>
            <span className="text-xs text-charcoal-faint leading-relaxed block">
              Hides calorie totals, weight, and streaks to start. You control this anytime in Settings —
              nothing you've logged is ever lost.
            </span>
          </span>
        </button>

        <p className="text-[11px] text-charcoal-tertiary text-center">
          Entirely optional — leave this off if it doesn't apply to you.
        </p>
      </div>
    </OnboardingShell>
  );
};
