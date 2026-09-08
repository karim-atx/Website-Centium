import React, { useRef, useState } from "react";
import { OnboardingShell } from "./OnboardingShell";
import { Button } from "../../components/ui/Button";
import type { OnboardingDraft } from "./Onboarding";
import type { Sex } from "../../types";
import clsx from "clsx";
import { Camera, FileText, Check, Venus, Mars, VenusAndMars } from "lucide-react";
import {
  ageFromDateOfBirth,
  isoDateYearsAgo,
  validateDateOfBirth,
  MIN_AGE,
  MAX_AGE,
} from "../../utils/date";
import { validateHeightCm, validateWeightKg } from "../../utils/bodyMetrics";

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
  const canContinue = draft.firstName.trim().length > 0;
  const [error, setError] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCertificationFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setDraft((d) => ({ ...d, certificationFile: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleContinue = () => {
    if (!isProfessional) {
      const height = Number(draft.heightCm);
      const weight = Number(draft.weightKg);

      if (draft.dateOfBirth) {
        const dobError = validateDateOfBirth(draft.dateOfBirth);
        if (dobError) {
          setError(dobError);
          return;
        }
      }
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
          <Button fullWidth size="lg" disabled={!canContinue} onClick={handleContinue}>
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

        {isProfessional ? (
          // V5 (QA 5.0): age/height/sex don't apply to a professional's own
          // profile — replaced with a certification upload instead.
          <div>
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Certification</span>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleCertificationFile(e.target.files[0])}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleCertificationFile(e.target.files[0])}
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="tap flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-charcoal/10 bg-cream-card py-5"
              >
                <Camera size={20} className="text-primary" />
                <span className="text-xs font-semibold text-charcoal-soft">Use camera</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="tap flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-charcoal/10 bg-cream-card py-5"
              >
                <FileText size={20} className="text-primary" />
                <span className="text-xs font-semibold text-charcoal-soft">Upload file</span>
              </button>
            </div>
            {draft.certificationFile && (
              <p className="flex items-center gap-1.5 text-xs text-primary-dark mt-2.5">
                <Check size={13} /> Submitted — pending authentication
              </p>
            )}
            <p className="text-[11px] text-charcoal-faint mt-2">
              Helps increase your professional credentials.
            </p>
          </div>
        ) : (
          <>
            {/* A real date, not an age. The native date input is the pattern
                already used across this app (medical records, calendars,
                metric detail), so no new dependency. min/max stop the picker
                offering out-of-range years at all; handleContinue still
                validates, since the field can also be typed into. */}
            <label className="block">
              <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
                Date of birth
              </span>
              <input
                type="date"
                value={draft.dateOfBirth}
                min={isoDateYearsAgo(MAX_AGE)}
                max={isoDateYearsAgo(MIN_AGE)}
                onChange={(e) => setDraft((d) => ({ ...d, dateOfBirth: e.target.value }))}
                className="w-full rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
              {draft.dateOfBirth && ageFromDateOfBirth(draft.dateOfBirth) !== undefined && (
                <p className="text-[11px] text-charcoal-faint mt-1.5">
                  {ageFromDateOfBirth(draft.dateOfBirth)} years old
                </p>
              )}
            </label>

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
