import React, { useEffect, useState } from "react";
import { OnboardingShell } from "./OnboardingShell";
import { Button } from "../../components/ui/Button";
import type { OnboardingDraft } from "./Onboarding";
import type { AccountType, BusinessType, CustomerSubtype, ProfessionalSubtype } from "../../types";
import clsx from "clsx";
import { User, Dumbbell, Building2, AlertCircle, Check, Loader2 } from "lucide-react";
import { previewClientCode, type ClientCodePreview } from "../../services/redemption";

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

const businessTypes: { value: BusinessType; label: string }[] = [
  { value: "gym", label: "Gym" },
  { value: "store", label: "Store" },
  { value: "supplement_store", label: "Supplement Store" },
  { value: "equipment_seller", label: "Equipment Seller" },
  { value: "wellness_service", label: "Wellness Service" },
  { value: "clothing_store", label: "Clothing Store" },
  { value: "meal_prep_service", label: "Meal-Prepping Service" },
];

type CodeCheck =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "found"; data: ClientCodePreview }
  | { status: "not_found" }
  | { status: "unusable"; message: string }
  | { status: "error"; message: string };

const subtypeLabel: Record<ProfessionalSubtype | "doctor", string> = {
  trainer: "Personal trainer",
  physiotherapist: "Physiotherapist",
  dietitian: "Dietitian",
  doctor: "Doctor",
  other: "Health professional",
};

export const AccountTypeStep: React.FC<Props> = ({ draft, setDraft, onNext, onBack }) => {
  const needsCode = draft.accountType === "customer" && draft.customerSubtype === "client";
  const enteredCode = draft.professionalUserIdCode.trim().toUpperCase();
  const [check, setCheck] = useState<CodeCheck>({ status: "idle" });

  // V6 (QA 6.0): the code must actually match one a professional generated.
  // That check used to run against a local array; it now calls
  // preview_client_code() — debounced, since it fires per keystroke — and
  // shows who the code actually belongs to before anything is redeemed.
  useEffect(() => {
    if (!needsCode || enteredCode.length === 0) {
      setCheck({ status: "idle" });
      setDraft((d) => (d.clientCodeProfessional ? { ...d, clientCodeProfessional: null } : d));
      return;
    }
    let cancelled = false;
    setCheck({ status: "checking" });
    const timer = setTimeout(async () => {
      const result = await previewClientCode(enteredCode);
      if (cancelled) return;

      if (result.status === "error") {
        setCheck({ status: "error", message: result.message });
        return;
      }
      if (result.status === "not_found") {
        setCheck({ status: "not_found" });
        setDraft((d) => ({ ...d, clientCodeProfessional: null }));
        return;
      }
      // Found, but that alone doesn't mean it can be used.
      if (result.data.redeemed) {
        setCheck({ status: "unusable", message: "That code has already been used." });
        setDraft((d) => ({ ...d, clientCodeProfessional: null }));
        return;
      }
      if (result.data.expiresAt && new Date(result.data.expiresAt).getTime() < Date.now()) {
        setCheck({ status: "unusable", message: "That code has expired — ask for a new one." });
        setDraft((d) => ({ ...d, clientCodeProfessional: null }));
        return;
      }
      setCheck({ status: "found", data: result.data });
      setDraft((d) => ({
        ...d,
        clientCodeProfessional: {
          id: result.data.professionalId,
          firstName: result.data.professionalFirstName,
          avatarUrl: result.data.professionalAvatarUrl,
          subtype: result.data.professionalSubtype as ProfessionalSubtype,
        },
      }));
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enteredCode, needsCode, setDraft]);

  const codeIsValid = check.status === "found";

  const canContinue =
    draft.accountType === "customer"
      ? !!draft.customerSubtype && (!needsCode || codeIsValid)
      : draft.accountType === "professional"
      ? !!draft.professionalSubtype
      : draft.accountType === "business"
      ? draft.businessName.trim().length > 0 && !!draft.businessType
      : false;

  return (
    <OnboardingShell
      title="What brings you to Centium?"
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
                active ? "bg-primary-pale border-primary" : "bg-cream-card border-charcoal/10"
              )}
            >
              <div
                className={clsx(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                  active ? "bg-primary text-white" : "bg-cream-soft text-charcoal-soft"
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
                    ? "bg-primary text-white border-primary"
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
                className={clsx(
                  "w-full rounded-2xl bg-cream-card border-2 px-4 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20",
                  check.status === "not_found" || check.status === "unusable" || check.status === "error"
                    ? "border-status-high/50"
                    : check.status === "found"
                    ? "border-status-good/60"
                    : "border-primary/50"
                )}
              />

              {check.status === "checking" && (
                <p className="flex items-center gap-1.5 text-[11px] text-charcoal-faint mt-1.5">
                  <Loader2 size={12} className="animate-spin" /> Checking code…
                </p>
              )}

              {check.status === "found" && (
                // Confirmation before anything is redeemed — the code is only
                // actually spent at the end of onboarding.
                <div className="mt-2 rounded-2xl bg-primary-pale p-3 flex items-center gap-3 animate-fade-slide-up">
                  {check.data.professionalAvatarUrl ? (
                    <img
                      src={check.data.professionalAvatarUrl}
                      alt=""
                      className="w-10 h-10 rounded-2xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0">
                      <Dumbbell size={18} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary-deep-text truncate">
                      You'll connect with {check.data.professionalFirstName}
                    </p>
                    <p className="text-[11px] text-primary-dark">
                      {subtypeLabel[check.data.professionalSubtype] ?? "Health professional"}
                    </p>
                  </div>
                  <Check size={16} className="text-status-good ml-auto shrink-0" />
                </div>
              )}

              {(check.status === "not_found" ||
                check.status === "unusable" ||
                check.status === "error") && (
                <p className="flex items-center gap-1.5 text-[11px] text-status-high mt-1.5">
                  <AlertCircle size={12} />{" "}
                  {check.status === "not_found"
                    ? "Code not found — check it and try again."
                    : check.message}
                </p>
              )}

              {check.status === "idle" && (
                <p className="text-[11px] text-charcoal-faint mt-1.5">
                  Ask your trainer, dietitian or physiotherapist for the code they generated for you.
                </p>
              )}
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
                    ? "bg-primary text-white border-primary"
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
              placeholder="Iron Peak Gym"
              className="w-full rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-3.5 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
            />
          </label>
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mt-4 mb-2">
            Business type
          </p>
          <div className="grid grid-cols-2 gap-2">
            {businessTypes.map((b) => (
              <button
                key={b.value}
                onClick={() => setDraft((d) => ({ ...d, businessType: b.value }))}
                className={clsx(
                  "tap rounded-xl py-2.5 px-3 text-xs font-semibold border transition-colors text-left",
                  draft.businessType === b.value
                    ? "bg-primary text-white border-primary"
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
      )}
    </OnboardingShell>
  );
};
