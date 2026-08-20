import React from "react";
import { Button } from "../../components/ui/Button";
import type { OnboardingDraft } from "./Onboarding";
import { PartyPopper } from "lucide-react";

export const ReadyStep: React.FC<{ draft: OnboardingDraft; onFinish: () => void }> = ({
  draft,
  onFinish,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-slide-up">
      <div className="w-20 h-20 rounded-full bg-ember-pale flex items-center justify-center mb-8 animate-pop">
        <PartyPopper size={34} className="text-ember" />
      </div>
      <h1 className="font-display text-3xl font-semibold text-charcoal mb-3">
        You're all set, {draft.firstName || "friend"}!
      </h1>
      <p className="text-charcoal-soft text-base leading-relaxed max-w-xs mb-10">
        We've built your personalized dashboard around your goals. Let's take a look.
      </p>

      <div className="w-full bg-cream-card rounded-3xl shadow-soft p-5 mb-10 text-left">
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-3">
          Your starting point
        </p>
        <div className="flex flex-wrap gap-2">
          {draft.goals.slice(0, 3).map((g) => (
            <span
              key={g}
              className="text-xs font-semibold bg-sohati-pale text-sohati-dark rounded-full px-3 py-1.5"
            >
              {g.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </div>

      <Button size="lg" fullWidth onClick={onFinish}>
        Let's go
      </Button>
    </div>
  );
};
