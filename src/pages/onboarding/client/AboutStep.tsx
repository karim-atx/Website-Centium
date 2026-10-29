import React, { useRef, useState } from "react";
import { Calendar, Lock, Mars, Ruler, Venus, VenusAndMars } from "lucide-react";
import type { OnboardingDraft } from "../Onboarding";
import type { Sex } from "../../../types";
import { ageFromDateOfBirth, isoDateYearsAgo, MAX_AGE, MIN_AGE, validateDateOfBirth } from "../../../utils/date";
import { validateHeightCm, validateWeightKg } from "../../../utils/bodyMetrics";
import { isReservedDisplayName } from "../../../services/profile";
import { ObFooter, ObStep } from "../shell/ObShell";
import { ObCollapsible, ObField, ObSeg, ObTip, ObUnits } from "../shell/ObBlocks";
import { OB_STRINGS, useOnboardingFlow } from "../shell/flow";

interface Props {
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  onNext: () => void;
  onBack: () => void;
}

// v6 (OB-087…091): Client lane · Step 1 of 4 · About you (BizOnboardingV10
// lane "client", step "about"). Kept: the reserved-name check (ATX37), the
// date of birth's 16+ rule, min/max and its "to change it later, contact support" note
// (KEEP-SAFETY; the date locks once saved, ATX51), height and weight bounds.
// New: the optional height and weight collapsible with cm/ft and kg/lb
// (stored metric either way).

const SEX: { value: Sex; label: string; icon: typeof Venus }[] = [
  { value: "female", label: "Female", icon: Venus },
  { value: "male", label: "Male", icon: Mars },
  { value: "other", label: "Other", icon: VenusAndMars },
];

const CM_PER_IN = 2.54;
const KG_PER_LB = 0.45359237;

/** 178 -> "5 ft 10 in". */
export function cmToFtText(cm: string): string {
  const n = Number(cm);
  if (!cm || !Number.isFinite(n) || n <= 0) return "";
  const total = Math.round(n / CM_PER_IN);
  return `${Math.floor(total / 12)} ft ${total % 12} in`;
}
/** "5 ft 10 in", "5'10", "5 10" -> "178"; "" when it cannot be read. */
export function ftTextToCm(text: string): string {
  const nums = text.match(/\d+(\.\d+)?/g);
  if (!nums) return "";
  const ft = Number(nums[0]);
  const inch = nums[1] ? Number(nums[1]) : 0;
  const cm = (ft * 12 + inch) * CM_PER_IN;
  return cm > 0 ? String(Math.round(cm)) : "";
}
export function kgToLbText(kg: string): string {
  const n = Number(kg);
  if (!kg || !Number.isFinite(n) || n <= 0) return "";
  return String(Math.round((n / KG_PER_LB) * 10) / 10).replace(/\.0$/, "");
}
export function lbTextToKg(text: string): string {
  const n = Number(text);
  if (!text || !Number.isFinite(n) || n <= 0) return "";
  return String(Math.round(n * KG_PER_LB * 10) / 10);
}

export const AboutStep: React.FC<Props> = ({ draft, setDraft, onNext, onBack }) => {
  const flow = useOnboardingFlow();
  const [open, setOpen] = useState(false);
  const [tried, setTried] = useState(false);
  const [reserved, setReserved] = useState(false);
  const [busy, setBusy] = useState(false);
  // The text in each unit field, so "5 ft 1" can be typed through.
  const [heightText, setHeightText] = useState(() => (draft.heightUnit === "ft" ? cmToFtText(draft.heightCm) : draft.heightCm));
  const [weightText, setWeightText] = useState(() => (draft.weightUnit === "lb" ? kgToLbText(draft.weightKg) : draft.weightKg));
  const dobRef = useRef<HTMLInputElement>(null);

  const nameError = tried && !draft.firstName.trim() ? "Add your name." : reserved ? "That name is reserved. Choose a different name." : null;
  // The 16+ rule shows as soon as a full date fails it (Task T).
  const dobProblem = draft.dateOfBirth ? validateDateOfBirth(draft.dateOfBirth) : tried ? validateDateOfBirth("") : null;
  const age = draft.dateOfBirth && !dobProblem ? ageFromDateOfBirth(draft.dateOfBirth) : undefined;
  const heightError = draft.heightCm ? validateHeightCm(Number(draft.heightCm)) : heightText.trim() ? "Enter a valid height." : null;
  const weightError = draft.weightKg ? validateWeightKg(Number(draft.weightKg)) : weightText.trim() ? "Enter a valid weight." : null;
  const shownBodyError = tried ? heightError ?? weightError : null;
  const errorCount = [nameError, tried ? dobProblem : null, tried ? heightError : null, tried ? weightError : null].filter(Boolean).length;

  const handleContinue = async () => {
    setTried(true);
    if (!draft.firstName.trim() || validateDateOfBirth(draft.dateOfBirth) || heightError || weightError) {
      if (heightError || weightError) setOpen(true);
      return;
    }
    // A NAME RESERVED FOR CENTIUM is refused by the database, but only at the
    // end-of-onboarding save; asked here instead.
    setBusy(true);
    const isReserved = await isReservedDisplayName(draft.firstName.trim());
    setBusy(false);
    if (isReserved === true) {
      setReserved(true);
      return;
    }
    onNext();
  };

  const summary =
    open || (!draft.heightCm && !draft.weightKg)
      ? "Private. Used only to set your targets."
      : [
          draft.heightCm ? (draft.heightUnit === "ft" ? cmToFtText(draft.heightCm) : `${draft.heightCm} cm`) : null,
          // Whole numbers on the summary, as drawn ("178 cm · 76 kg").
          draft.weightKg ? (draft.weightUnit === "lb" ? `${Math.round(Number(kgToLbText(draft.weightKg)))} lb` : `${Math.round(Number(draft.weightKg))} kg`) : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <ObStep
      lane="client"
      step="about"
      title="About you"
      subtitle="This helps us personalise your targets. Only you see it."
      onBack={onBack}
      footer={
        <ObFooter
          error={errorCount > 0 ? `Fix ${errorCount} thing${errorCount === 1 ? "" : "s"} to continue.` : !flow?.online ? OB_STRINGS.offlineStep : null}
          errorTone={errorCount > 0 ? "error" : "info"}
          primary={{ label: "Continue", disabled: busy || errorCount > 0, onClick: () => void handleContinue() }}
        />
      }
    >
      <ObField
        label="Name"
        placeholder="e.g. Jane Smith"
        autoComplete="given-name"
        value={draft.firstName}
        error={nameError}
        onChange={(e) => {
          setReserved(false);
          setDraft((d) => ({ ...d, firstName: e.target.value }));
        }}
      />
      <ObField
        ref={dobRef}
        label="Date of birth"
        type="date"
        required
        min={isoDateYearsAgo(MAX_AGE)}
        max={isoDateYearsAgo(MIN_AGE)}
        value={draft.dateOfBirth}
        onChange={(e) => setDraft((d) => ({ ...d, dateOfBirth: e.target.value }))}
        error={dobProblem}
        help={age !== undefined ? `${age} years old` : "Required. Check it before saving; to change it later, contact support."}
        end={
          <button type="button" className="hit" aria-label="Choose a date" onClick={() => dobRef.current?.showPicker?.()} style={{ display: "flex" }}>
            <Calendar size={16} strokeWidth={2} />
          </button>
        }
      />
      <ObSeg label="Sex" value={draft.sex} options={SEX} onChange={(v) => setDraft((d) => ({ ...d, sex: v }))} />
      <ObCollapsible icon={Ruler} title="Optional: height and weight" summary={summary} open={open} onToggle={() => setOpen((o) => !o)} margin="6px 0 12px" controls="ob-about-body" />
      {open && (
        <div id="ob-about-body">
          <ObUnits
            items={[
              {
                label: "Height",
                value: heightText,
                inputMode: draft.heightUnit === "ft" ? undefined : "numeric",
                placeholder: draft.heightUnit === "ft" ? "5 ft 10 in" : "178",
                units: [
                  { value: "cm", label: "cm" },
                  { value: "ft", label: "ft" },
                ],
                unit: draft.heightUnit,
                error: tried && !!heightError,
                onChange: (v) => {
                  setHeightText(v);
                  setDraft((d) => ({ ...d, heightCm: d.heightUnit === "ft" ? ftTextToCm(v) : v.replace(/\D/g, "") }));
                },
                onUnit: (u) => {
                  const unit = u as "cm" | "ft";
                  setHeightText(unit === "ft" ? cmToFtText(draft.heightCm) : draft.heightCm);
                  setDraft((d) => ({ ...d, heightUnit: unit }));
                },
              },
              {
                label: "Weight",
                value: weightText,
                inputMode: "decimal",
                placeholder: draft.weightUnit === "lb" ? "168" : "76.4",
                units: [
                  { value: "kg", label: "kg" },
                  { value: "lb", label: "lb" },
                ],
                unit: draft.weightUnit,
                error: tried && !!weightError,
                onChange: (v) => {
                  const clean = v.replace(/[^\d.]/g, "");
                  setWeightText(clean);
                  setDraft((d) => ({ ...d, weightKg: d.weightUnit === "lb" ? lbTextToKg(clean) : clean }));
                },
                onUnit: (u) => {
                  const unit = u as "kg" | "lb";
                  setWeightText(unit === "lb" ? kgToLbText(draft.weightKg) : draft.weightKg);
                  setDraft((d) => ({ ...d, weightUnit: unit }));
                },
              },
            ]}
          />
          {shownBodyError && (
            <div className="ob-help" data-err="true" style={{ margin: "-8px 0 12px" }}>
              <span role="alert">{shownBodyError}</span>
            </div>
          )}
          <ObTip icon={Lock} margin="0">
            Leave these blank if you prefer. You can add them later in Profile.
          </ObTip>
        </div>
      )}
    </ObStep>
  );
};
