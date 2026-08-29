import React, { useRef, useState } from "react";
import { OnboardingShell } from "./OnboardingShell";
import { Button } from "../../components/ui/Button";
import type { OnboardingDraft } from "./Onboarding";
import type { Sex } from "../../types";
import clsx from "clsx";
import { Camera, FileText, Check, Venus, Mars, VenusAndMars } from "lucide-react";

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

// V7 (QA 7.0): reject exaggerated age/height/weight instead of silently
// accepting them — wide enough to allow any real person, narrow enough to
// catch fat-fingered or joke values.
const AGE_RANGE = [10, 100] as const;
const HEIGHT_RANGE = [100, 250] as const;
const WEIGHT_RANGE = [25, 300] as const;

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
      const age = Number(draft.age);
      const height = Number(draft.heightCm);
      const weight = Number(draft.weightKg);
      if (draft.age && (age < AGE_RANGE[0] || age > AGE_RANGE[1])) {
        setError(`Age should be between ${AGE_RANGE[0]} and ${AGE_RANGE[1]}.`);
        return;
      }
      if (draft.heightCm && (height < HEIGHT_RANGE[0] || height > HEIGHT_RANGE[1])) {
        setError(`Height should be between ${HEIGHT_RANGE[0]} and ${HEIGHT_RANGE[1]}cm.`);
        return;
      }
      if (draft.weightKg && (weight < WEIGHT_RANGE[0] || weight > WEIGHT_RANGE[1])) {
        setError(`Weight should be between ${WEIGHT_RANGE[0]} and ${WEIGHT_RANGE[1]}kg.`);
        return;
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
          {error && <p className="text-xs font-semibold text-[#C0392B] mb-3 text-center">{error}</p>}
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
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Age</span>
                <input
                  value={draft.age}
                  onChange={(e) => setDraft((d) => ({ ...d, age: e.target.value.replace(/\D/g, "") }))}
                  placeholder="29"
                  inputMode="numeric"
                  className="w-full rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
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
                  className="w-full rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
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
                className="w-full rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
            </label>

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
