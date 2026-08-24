import React from "react";
import { OnboardingShell } from "./OnboardingShell";
import { Button } from "../../components/ui/Button";
import type { OnboardingDraft } from "./Onboarding";
import type { AccountType, CustomerSubtype, ProfessionalSubtype } from "../../types";
import clsx from "clsx";
import { User, Dumbbell, Building2 } from "lucide-react";

interface Props {
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  onNext: () => void;
  onBack: () => void;
}

const accountTypes: { value: AccountType; label: string; desc: string; icon: typeof User }[] = [
  { value: "customer", label: "Customer", desc: "I want to track my own health & fitness", icon: User },
  { value: "professional", label: "Professional", desc: "I'm a trainer, dietitian, or physiotherapist.", icon: Dumbbell },
  { value: "business", label: "Business", desc: "Gym, studio or wellness business", icon: Building2 },
];

// Sequential order per QA: General User first, then Client of Professional.
const customerSubtypes: { value: CustomerSubtype; label: string }[] = [
  { value: "general", label: "General User" },
  { value: "client", label: "Client of Professional" },
];

// Physiotherapist listed directly under Personal Trainer per QA.
const professionalSubtypes: { value: ProfessionalSubtype; label: string }[] = [
  { value: "trainer", label: "Personal Trainer" },
  { value: "physiotherapist", label: "Physiotherapist" },
  { value: "dietitian", label: "Dietitian" },
  { value: "other", label: "Other health/fitness professional" },
];

export const AccountTypeStep: React.FC<Props> = ({ draft, setDraft, onNext, onBack }) => {
  const needsCode = draft.accountType === "customer" && draft.customerSubtype === "client";

  const canContinue =
    draft.accountType === "customer"
      ? !!draft.customerSubtype && (!needsCode || draft.professionalUserIdCode.trim().length > 0)
      : draft.accountType === "professional"
      ? !!draft.professionalSubtype
      : draft.accountType === "business"
      ? draft.businessName.trim().length > 0
      : false;

  return (
    <OnboardingShell
      title="What brings you to Sohati?"
      subtitle="This shapes your experience — you can adjust it later."
      onBack={onBack}
      footer={
        <Button fullWidth size="lg" disabled={!canContinue} onClick={onNext}>
          Continue
        </Button>
      }
    >
      <div className="space-y-2.5 mb-6">
        {accountTypes.map((t) => {
          const active = draft.accountType === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setDraft((d) => ({ ...d, accountType: t.value }))}
              className={clsx(
                "tap w-full flex items-center gap-3.5 text-left rounded-2xl p-4 border transition-colors",
                active ? "bg-sohati-pale border-sohati" : "bg-cream-card border-charcoal/10"
              )}
            >
              <div
                className={clsx(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                  active ? "bg-sohati text-white" : "bg-cream-soft text-charcoal-soft"
                )}
              >
                <t.icon size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-charcoal">{t.label}</p>
                <p className="text-xs text-charcoal-soft">{t.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {draft.accountType === "customer" && (
        <div className="animate-fade-slide-up">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
            I am a…
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {customerSubtypes.map((s) => (
              <button
                key={s.value}
                onClick={() => setDraft((d) => ({ ...d, customerSubtype: s.value }))}
                className={clsx(
                  "tap rounded-xl py-2.5 px-3 text-xs font-semibold border transition-colors text-left",
                  draft.customerSubtype === s.value
                    ? "bg-sohati text-white border-sohati"
                    : "bg-cream-card border-charcoal/10 text-charcoal-soft"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {needsCode && (
            <label className="block animate-fade-slide-up">
              <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
                Your professional's User ID
              </span>
              <input
                value={draft.professionalUserIdCode}
                onChange={(e) => setDraft((d) => ({ ...d, professionalUserIdCode: e.target.value }))}
                placeholder="SOHA-XXXX"
                className="w-full rounded-2xl bg-cream-card border-2 border-sohati/50 px-4 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
              />
              <p className="text-[11px] text-charcoal-faint mt-1.5">
                Ask your trainer, dietitian or physiotherapist for the code they generated for you.
              </p>
            </label>
          )}

          <p className="text-xs text-charcoal-faint mt-3">
            <em>This can be changed later in settings at anytime.</em>
          </p>
        </div>
      )}

      {draft.accountType === "professional" && (
        <div className="animate-fade-slide-up">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
            My specialty
          </p>
          <div className="space-y-2">
            {professionalSubtypes.map((s) => (
              <button
                key={s.value}
                onClick={() => setDraft((d) => ({ ...d, professionalSubtype: s.value }))}
                className={clsx(
                  "tap w-full rounded-xl py-2.5 px-3 text-sm font-semibold border transition-colors text-left",
                  draft.professionalSubtype === s.value
                    ? "bg-sohati text-white border-sohati"
                    : "bg-cream-card border-charcoal/10 text-charcoal-soft"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {draft.accountType === "business" && (
        <div className="animate-fade-slide-up">
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
              Business name
            </span>
            <input
              value={draft.businessName}
              onChange={(e) => setDraft((d) => ({ ...d, businessName: e.target.value }))}
              placeholder="Gold's Gym Beirut"
              className="w-full rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-sohati/50 focus:ring-2 focus:ring-sohati/10"
            />
          </label>
          <p className="text-xs text-charcoal-faint mt-2">
            Business/marketplace tools are an early preview in this prototype.
          </p>
        </div>
      )}
    </OnboardingShell>
  );
};
