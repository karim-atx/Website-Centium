import React, { useEffect, useState } from "react";
import { OnboardingShell } from "./OnboardingShell";
import { Button } from "../../components/ui/Button";
import type { OnboardingDraft } from "./Onboarding";
import type { Sex } from "../../types";
import clsx from "clsx";
import { Check, Venus, Mars, VenusAndMars } from "lucide-react";
import { validateDateOfBirth } from "../../utils/date";
import { DobField } from "./DobField";
import { dateOfBirthComplete } from "./onboardingSteps";
import { validateHeightCm, validateWeightKg } from "../../utils/bodyMetrics";
import { useApp } from "../../context/AppContext";
import { fetchCertificationPath, uploadCertification } from "../../services/certification";
import { isReservedDisplayName } from "../../services/profile";
import { AttachDocument } from "../../components/ui/AttachDocument";

interface Props {
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  onNext: () => void;
  onBack: () => void;
}

const sexOptions: { value: Sex; label: string; icon: typeof Venus }[] = [
  { value: "female", label: "Female", icon: Venus },
  { value: "male", label: "Male", icon: Mars },
  { value: "other", label: "Other", icon: VenusAndMars },
];

// Height/weight bounds and messages live in utils/bodyMetrics, shared with
// the Profile tab's editors — same reason as the date-of-birth rule below.

// Date of birth replaced a free-typed age. The bounds are on the DATE, so a
// birthday passing never invalidates a profile the way an age bound would.
// MIN_AGE/MAX_AGE and the validation rule live in utils/date so the Profile
// tab's editor enforces exactly the same thing.

export const AboutYouStep: React.FC<Props> = ({ draft, setDraft, onNext, onBack }) => {
  const isProfessional = draft.accountType === "professional";
  // Task T: no Continue without a valid date of birth (16+), for everyone.
  const canContinue = draft.firstName.trim().length > 0 && dateOfBirthComplete(draft);
  const [error, setError] = useState<string | null>(null);

  const { authUserId } = useApp();

  // THE SERVER'S CERTIFICATE, NOT THE DRAFT'S. The draft lives in this
  // browser, so onboarding resumed on another device (or after the browser's
  // storage was cleared) used to replace a file it did not know about and
  // leave the old one in the bucket. The stored path is read first, and a
  // replace deletes what is actually there. `undefined` = not read yet.
  const [serverPath, setServerPath] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!isProfessional || !authUserId) return;
    let cancelled = false;
    void fetchCertificationPath(authUserId).then((result) => {
      if (cancelled) return;
      // A failed read must not lock the buttons: treat it as no known file.
      if (!result.ok) {
        setServerPath(null);
        return;
      }
      setServerPath(result.path);
      setDraft((d) => (d.certificationFile === result.path ? d : { ...d, certificationFile: result.path }));
    });
    return () => {
      cancelled = true;
    };
  }, [isProfessional, authUserId, setDraft]);

  // A REAL UPLOAD, at the moment the file is picked.
  //
  // This used to read the file into a base64 `data:` URL and keep it in the
  // onboarding draft, which then carried it into local profile state and no
  // further — nothing was uploaded and certification_url was never written.
  // The step said "Submitted — pending authentication" about bytes that had
  // never left the device.
  //
  // UPLOADED HERE RATHER THAN HELD UNTIL THE END OF ONBOARDING. Carrying the
  // file through three more steps to upload it at completion would mean
  // holding a multi-megabyte document in React state across navigation, and
  // would put the one upload that can fail at the exact moment the user is
  // being told they are finished. Storing it now costs an early
  // professional_profiles row for someone who abandons the flow, which is
  // their own data and harmless.
  //
  // The database turns this certificate into licence #1 of the CV (a trigger
  // on professional_profiles), which is how it appears on the next step.
  const handleCertificationFile = async (file: File) => {
    if (!authUserId) return { ok: false as const, message: "You're signed out. Go back and sign in again." };
    const result = await uploadCertification(authUserId, file, serverPath ?? null);
    if (!result.ok) return result;
    // The draft carries the object PATH, not the bytes — the same value the
    // column holds, which is what Onboarding hands to profile state.
    setServerPath(result.path);
    setDraft((d) => ({ ...d, certificationFile: result.path }));
    return { ok: true as const };
  };

  const handleContinue = async () => {
    // A NAME RESERVED FOR CENTIUM ("Centium Support" and variants) is refused by
    // the database, but only at the end-of-onboarding save, which is
    // best-effort and would fail the whole profile silently. Asked here instead.
    if ((await isReservedDisplayName(draft.firstName.trim())) === true) {
      setError("That name is reserved. Choose a different name.");
      return;
    }
    // Required now (task T), for every account type, and checked again here
    // because the button can be reached before a re-render settles.
    const dobError = validateDateOfBirth(draft.dateOfBirth);
    if (dobError) {
      setError(dobError);
      return;
    }
    if (!isProfessional) {
      const height = Number(draft.heightCm);
      const weight = Number(draft.weightKg);

      if (draft.heightCm) {
        const heightError = validateHeightCm(height);
        if (heightError) {
          setError(heightError);
          return;
        }
      }
      if (draft.weightKg) {
        const weightError = validateWeightKg(weight);
        if (weightError) {
          setError(weightError);
          return;
        }
      }
    }
    setError(null);
    onNext();
  };

  return (
    <OnboardingShell
      title="About you"
      subtitle={
        isProfessional
          ? "Sets up your own Centium profile — you'll add clients next."
          : "This helps us personalize your targets."
      }
      onBack={onBack}
      footer={
        <div>
          {error && <p className="text-xs font-semibold text-status-high mb-3 text-center">{error}</p>}
          <Button fullWidth size="lg" disabled={!canContinue} onClick={() => void handleContinue()}>
            Continue
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Name</span>
          <input
            value={draft.firstName}
            onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
            placeholder="Abdallah Karam"
            className="w-full rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          />
        </label>

        {/* Task T: required for clients and professionals alike (a business
            gives it on its own step). Above the professional/client split so
            both see the same field. */}
        <DobField value={draft.dateOfBirth} onChange={(v) => setDraft((d) => ({ ...d, dateOfBirth: v }))} />

        {isProfessional ? (
          // V5 (QA 5.0): age/height/sex don't apply to a professional's own
          // profile — replaced with a certification upload instead.
          <div>
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Certification</span>
            <AttachDocument
              bucket="certifications"
              path={serverPath ?? null}
              onFile={handleCertificationFile}
              label="Certificate"
              disabled={serverPath === undefined}
            />
            {serverPath && (
              <p className="flex items-center gap-1.5 text-xs text-primary-dark">
                <Check size={13} /> Saved to your account
              </p>
            )}
            <p className="text-[11px] text-charcoal-faint mt-2">
              Helps increase your professional credentials.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Height (cm)</span>
                <input
                  value={draft.heightCm}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, heightCm: e.target.value.replace(/\D/g, "") }))
                  }
                  placeholder="178"
                  inputMode="numeric"
                  className="w-full rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                />
              </label>
              {/* Weight moves up beside Height, taking the slot Age used to
                  occupy — date of birth needs the full width for the picker. */}
              <label className="block">
                <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Weight (kg)</span>
                <input
                  value={draft.weightKg}
                  onChange={(e) => setDraft((d) => ({ ...d, weightKg: e.target.value.replace(/[^\d.]/g, "") }))}
                  placeholder="106.4"
                  inputMode="decimal"
                  className="w-full rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                />
              </label>
            </div>

            <div>
              <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Sex</span>
              <div className="grid grid-cols-3 gap-2">
                {sexOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDraft((d) => ({ ...d, sex: opt.value }))}
                    aria-label={opt.label}
                    title={opt.label}
                    className={clsx(
                      "tap flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 border transition-colors",
                      draft.sex === opt.value
                        ? "bg-primary text-white border-primary"
                        : "bg-cream-card text-charcoal-soft border-charcoal/10"
                    )}
                  >
                    <opt.icon size={20} />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </OnboardingShell>
  );
};
