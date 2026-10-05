import React from "react";
import clsx from "clsx";
import { OnboardingShell } from "./OnboardingShell";
import { Button } from "../../components/ui/Button";
import type { OnboardingDraft } from "./Onboarding";
import type { BusinessType, ProfessionalSubtype } from "../../types";

interface Props {
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  onNext: () => void;
  onBack: () => void;
}

// Physiotherapist listed directly under Personal Trainer per QA.
const professionalSubtypes: { value: ProfessionalSubtype; label: string }[] = [
  { value: "trainer", label: "Personal Trainer" },
  { value: "physiotherapist", label: "Physiotherapist" },
  { value: "dietitian", label: "Dietitian" },
  { value: "other", label: "Other health/fitness professional" },
];

const businessTypes: { value: BusinessType; label: string }[] = [
  { value: "gym", label: "Gym" },
  { value: "store", label: "Store" },
  { value: "supplement_store", label: "Supplement Store" },
  { value: "equipment_seller", label: "Equipment Seller" },
  { value: "wellness_service", label: "Wellness Service" },
  { value: "clothing_store", label: "Clothing Store" },
  { value: "meal_prep_service", label: "Meal-Prepping Service" },
];

/**
 * The step after the account type, for professionals and businesses only:
 * the professional's specialty, or the business's name and kind. Moved here
 * from the account-type step unchanged — same options, same order, same
 * rule for Continue (a specialty; or a business name and a type). Customers
 * never see it.
 *
 * Saved exactly as before: profiles.professional_subtype, and the business
 * name and type, all written at the end of onboarding from the draft.
 */
export const SubtypeStep: React.FC<Props> = ({ draft, setDraft, onNext, onBack }) => {
  const isBusiness = draft.accountType === "business";
  const canContinue = isBusiness
    ? draft.businessName.trim().length > 0 && !!draft.businessType
    : !!draft.professionalSubtype;

  return (
    <OnboardingShell
      title={isBusiness ? "What kind of business is this?" : "What kind of professional are you?"}
      subtitle="This shapes your experience. You can adjust it later."
      onBack={onBack}
      footer={
        <Button fullWidth size="lg" disabled={!canContinue} onClick={onNext}>
          Continue
        </Button>
      }
    >
      {isBusiness ? (
        <div>
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Business name</span>
            <input
              value={draft.businessName}
              onChange={(e) => setDraft((d) => ({ ...d, businessName: e.target.value }))}
              placeholder="Iron Peak Gym"
              className="w-full rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
            />
          </label>
          <p id="business-type-label" className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mt-4 mb-2">
            Business type
          </p>
          <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="business-type-label">
            {businessTypes.map((b) => (
              <button
                key={b.value}
                type="button"
                aria-pressed={draft.businessType === b.value}
                onClick={() => setDraft((d) => ({ ...d, businessType: b.value }))}
                className={clsx(
                  "tap rounded-xl py-2.5 px-3 text-xs font-semibold border transition-colors text-left",
                  draft.businessType === b.value
                    ? "bg-primary-fill text-on-primary-fill border-primary-fill"
                    : "bg-cream-card border-charcoal/10 text-charcoal-soft"
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-charcoal-faint mt-3">
            Business/marketplace tools are an early preview in this prototype.
          </p>
        </div>
      ) : (
        <div>
          <p id="specialty-label" className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
            My specialty
          </p>
          <div className="space-y-2" role="group" aria-labelledby="specialty-label">
            {professionalSubtypes.map((s) => (
              <button
                key={s.value}
                type="button"
                aria-pressed={draft.professionalSubtype === s.value}
                onClick={() => setDraft((d) => ({ ...d, professionalSubtype: s.value }))}
                className={clsx(
                  "tap w-full rounded-xl py-2.5 px-3 text-sm font-semibold border transition-colors text-left",
                  draft.professionalSubtype === s.value
                    ? "bg-primary-fill text-on-primary-fill border-primary-fill"
                    : "bg-cream-card border-charcoal/10 text-charcoal-soft"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </OnboardingShell>
  );
};
