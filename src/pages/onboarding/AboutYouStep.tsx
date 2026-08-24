import React, { useRef } from "react";
import { OnboardingShell } from "./OnboardingShell";
import { Button } from "../../components/ui/Button";
import type { OnboardingDraft } from "./Onboarding";
import type { Sex } from "../../types";
import clsx from "clsx";
import { Camera, FileText, Check } from "lucide-react";

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
  const isProfessional = draft.accountType === "professional";
  const canContinue = draft.firstName.trim().length > 0;

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCertificationFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setDraft((d) => ({ ...d, certificationFile: reader.result as string }));
    reader.readAsDataURL(file);
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
                <Camera size={20} className="text-sohati" />
                <span className="text-xs font-semibold text-charcoal-soft">Use camera</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="tap flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-charcoal/10 bg-cream-card py-5"
              >
                <FileText size={20} className="text-sohati" />
                <span className="text-xs font-semibold text-charcoal-soft">Upload file</span>
              </button>
            </div>
            {draft.certificationFile && (
              <p className="flex items-center gap-1.5 text-xs text-sohati-dark mt-2.5">
                <Check size={13} /> Certification attached
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
          </>
        )}
      </div>
    </OnboardingShell>
  );
};
