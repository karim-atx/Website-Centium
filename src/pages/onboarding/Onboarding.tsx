import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import type {
  AccountType,
  ActivityLevel,
  CustomerSubtype,
  Goal,
  ProfessionalSubtype,
  Sex,
  TrackPreference,
} from "../../types";
import { WelcomeStep } from "./WelcomeStep";
import { AccountTypeStep } from "./AccountTypeStep";
import { AboutYouStep } from "./AboutYouStep";
import { GoalStep } from "./GoalStep";
import { ActivityStep } from "./ActivityStep";
import { TrackingStep } from "./TrackingStep";
import { ReadyStep } from "./ReadyStep";

export interface OnboardingDraft {
  accountType: AccountType | null;
  customerSubtype: CustomerSubtype | null;
  professionalSubtype: ProfessionalSubtype | null;
  professionalUserIdCode: string;
  businessName: string;
  firstName: string;
  age: string;
  sex: Sex;
  heightCm: string;
  weightKg: string;
  goals: Goal[];
  activityLevel: ActivityLevel | null;
  tracking: TrackPreference[];
}

const initialDraft: OnboardingDraft = {
  accountType: null,
  customerSubtype: null,
  professionalSubtype: null,
  professionalUserIdCode: "",
  businessName: "",
  firstName: "",
  age: "",
  sex: "female",
  heightCm: "",
  weightKg: "",
  goals: [],
  activityLevel: null,
  tracking: [],
};

type StepKey = "welcome" | "accountType" | "aboutYou" | "goal" | "activity" | "tracking" | "ready";

// V4 (QA 4.0): professionals are onboarding to add clients, not to be
// tracked themselves — the goal/activity-level/tracking-preference steps
// are customer-only questions, so professionals skip straight from About
// You to the finish screen (coaching-app style onboarding, not a client
// health-tracking wizard).
function stepsFor(accountType: OnboardingDraft["accountType"]): StepKey[] {
  const isProfessional = accountType === "professional";
  return [
    "welcome",
    "accountType",
    "aboutYou",
    ...(isProfessional ? [] : (["goal", "activity", "tracking"] as StepKey[])),
    "ready",
  ];
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft);
  const { completeOnboarding, redeemClientCode } = useApp();
  const navigate = useNavigate();

  const steps = stepsFor(draft.accountType);
  const stepKey = steps[Math.min(step, steps.length - 1)];

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const isProfessional = draft.accountType === "professional";

  const finish = () => {
    completeOnboarding({
      accountType: draft.accountType || "customer",
      customerSubtype: draft.accountType === "customer" ? draft.customerSubtype || "general" : undefined,
      professionalSubtype:
        draft.accountType === "professional" ? draft.professionalSubtype || "other" : undefined,
      businessName: draft.accountType === "business" ? draft.businessName : undefined,
      firstName: draft.firstName || "Friend",
      age: Number(draft.age) || 28,
      sex: draft.sex,
      heightCm: Number(draft.heightCm) || 170,
      weightKg: Number(draft.weightKg) || 70,
      goals: draft.goals.length ? draft.goals : ["improve_health"],
      activityLevel: draft.activityLevel || "moderate",
      tracking: draft.tracking.length ? draft.tracking : ["nutrition", "workouts"],
    });
    if (draft.customerSubtype === "client" && draft.professionalUserIdCode.trim()) {
      redeemClientCode(draft.professionalUserIdCode);
    }
    // Professionals land straight in their client dashboard — mirroring a
    // coaching app's first-run flow — instead of the consumer Home page.
    navigate(isProfessional ? "/professionals" : "/");
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {step > 0 && (
        <div className="px-6 pt-6 flex items-center gap-2">
          {Array.from({ length: steps.length - 1 }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors duration-300"
              style={{ background: i <= step - 1 ? "rgb(var(--c-sohati))" : "rgb(var(--c-cream-soft))" }}
            />
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-col px-6 pt-8 pb-10 max-w-md mx-auto w-full">
        {stepKey === "welcome" && <WelcomeStep onNext={next} />}
        {stepKey === "accountType" && (
          <AccountTypeStep draft={draft} setDraft={setDraft} onNext={next} onBack={back} />
        )}
        {stepKey === "aboutYou" && (
          <AboutYouStep draft={draft} setDraft={setDraft} onNext={next} onBack={back} />
        )}
        {stepKey === "goal" && <GoalStep draft={draft} setDraft={setDraft} onNext={next} onBack={back} />}
        {stepKey === "activity" && (
          <ActivityStep draft={draft} setDraft={setDraft} onNext={next} onBack={back} />
        )}
        {stepKey === "tracking" && (
          <TrackingStep draft={draft} setDraft={setDraft} onNext={next} onBack={back} />
        )}
        {stepKey === "ready" && <ReadyStep draft={draft} onFinish={finish} isProfessional={isProfessional} />}
      </div>
    </div>
  );
}
