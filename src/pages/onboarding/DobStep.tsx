import React from "react";
import { OnboardingShell } from "./OnboardingShell";
import { Button } from "../../components/ui/Button";
import type { OnboardingDraft } from "./Onboarding";
import { DobField } from "./DobField";
import { dateOfBirthComplete } from "./onboardingSteps";

/**
 * Task T: a business account's date of birth, for the person who runs it.
 *
 * Businesses have no About You step (nothing about a gym is a body to
 * track), but every account needs a date of birth, so this is that one
 * field on its own. Same input and the same 16+ rule as About You.
 */
export const DobStep: React.FC<{
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  onNext: () => void;
  onBack: () => void;
}> = ({ draft, setDraft, onNext, onBack }) => {
  const ok = dateOfBirthComplete(draft);
  return (
    <OnboardingShell
      title="Your date of birth"
      subtitle="For the person who runs this account. Every Centium account needs one."
      onBack={onBack}
      footer={
        <Button fullWidth size="lg" disabled={!ok} onClick={() => ok && onNext()}>
          Continue
        </Button>
      }
    >
      <DobField
        value={draft.dateOfBirth}
        onChange={(v) => setDraft((d) => ({ ...d, dateOfBirth: v }))}
        onEnter={() => ok && onNext()}
      />
    </OnboardingShell>
  );
};
