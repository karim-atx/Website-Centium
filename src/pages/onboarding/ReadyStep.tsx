import React from "react";
import { Button } from "../../components/ui/Button";
import type { OnboardingDraft } from "./Onboarding";
import { PartyPopper } from "lucide-react";

export const ReadyStep: React.FC<{
  draft: OnboardingDraft;
  onFinish: () => void;
  isProfessional?: boolean;
  // Set when the client code couldn't be redeemed at the last moment. The
  // rest of onboarding is already saved, so this explains what happened and
  // the button becomes a plain "continue anyway" rather than a dead end.
  notice?: string | null;
  busy?: boolean;
}> = ({ draft, onFinish, isProfessional, notice, busy }) => {
  // V10 (QA 10.0): "The picture attached is the last page for the
  // onboarding for the professionals/business UI that resembles more
  // Client UI features... adjust accordingly" — the professional/business
  // final step used to fall back to the generic client copy with an empty
  // "starting point" card; each account type now gets its own tailored
  // headline and a summary card populated with what it actually set up.
  const isBusiness = draft.accountType === "business";
  const isCustomer = !isProfessional && !isBusiness;

  const headline = isProfessional
    ? "Your professional dashboard is ready — start by adding your first client."
    : isBusiness
    ? "Your business listing is ready — clients can find you on Centium Explore."
    : "We've built your personalized dashboard around your goals. Let's take a look.";

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-slide-up">
      <div className="w-20 h-20 rounded-full bg-teal-pale flex items-center justify-center mb-8 animate-pop">
        <PartyPopper size={34} className="text-teal" />
      </div>
      <h1 className="font-display text-3xl font-semibold text-charcoal mb-3">
        You're all set, {draft.firstName || "friend"}!
      </h1>
      <p className="text-charcoal-soft text-base leading-relaxed max-w-xs mb-10">{headline}</p>

      {isCustomer && (
        <div className="w-full bg-cream-card rounded-3xl shadow-soft p-5 mb-10 text-left">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-3">
            Your starting point
          </p>
          <div className="flex flex-wrap gap-2">
            {draft.goals.slice(0, 3).map((g) => (
              <span
                key={g}
                className="text-xs font-semibold bg-primary-pale text-primary-dark rounded-full px-3 py-1.5"
              >
                {g.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {isProfessional && (
        <div className="w-full bg-cream-card rounded-3xl shadow-soft p-5 mb-10 text-left">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-3">
            Your profile
          </p>
          <div className="flex flex-wrap gap-2">
            {draft.professionalSubtype && (
              <span className="text-xs font-semibold bg-primary-pale text-primary-dark rounded-full px-3 py-1.5 capitalize">
                {draft.professionalSubtype}
              </span>
            )}
            <span className="text-xs font-semibold bg-primary-pale text-primary-dark rounded-full px-3 py-1.5">
              {draft.certificationFile ? "Certification submitted" : "No certification yet"}
            </span>
          </div>
        </div>
      )}

      {isBusiness && (
        <div className="w-full bg-cream-card rounded-3xl shadow-soft p-5 mb-10 text-left">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-3">
            Your business
          </p>
          <div className="flex flex-wrap gap-2">
            {draft.businessName && (
              <span className="text-xs font-semibold bg-primary-pale text-primary-dark rounded-full px-3 py-1.5">
                {draft.businessName}
              </span>
            )}
            {draft.businessType && (
              <span className="text-xs font-semibold bg-primary-pale text-primary-dark rounded-full px-3 py-1.5 capitalize">
                {draft.businessType.replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>
      )}

      {notice && (
        <div className="w-full rounded-2xl bg-cream-card border border-status-high/30 px-4 py-3 mb-4 text-left">
          <p className="text-xs text-charcoal-soft leading-relaxed">{notice}</p>
        </div>
      )}

      <Button
        size="lg"
        fullWidth
        onClick={onFinish}
        disabled={busy}
        className={!isCustomer && !notice ? "mt-10" : undefined}
      >
        {busy
          ? "Setting up…"
          : notice
          ? "Continue anyway"
          : isProfessional || isBusiness
          ? "Go to my dashboard"
          : "Let's go"}
      </Button>
    </div>
  );
};
