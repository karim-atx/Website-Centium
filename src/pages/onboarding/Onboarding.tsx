import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { updateProfileFromOnboarding } from "../../services/profile";
import type {
  AccountType,
  ActivityLevel,
  BusinessType,
  CustomerSubtype,
  Goal,
  ProfessionalSubtype,
  Sex,
  TrackPreference,
} from "../../types";
import { WelcomeStep } from "./WelcomeStep";
import { AuthStep } from "./AuthStep";
import { AccountTypeStep } from "./AccountTypeStep";
import { AboutYouStep } from "./AboutYouStep";
import { GoalStep } from "./GoalStep";
import { ActivityStep } from "./ActivityStep";
import { RecoveryStep } from "./RecoveryStep";
import { TrackingStep } from "./TrackingStep";
import { ReadyStep } from "./ReadyStep";

export interface OnboardingDraft {
  email: string;
  accountType: AccountType | null;
  customerSubtype: CustomerSubtype | null;
  professionalSubtype: ProfessionalSubtype | null;
  professionalUserIdCode: string;
  businessName: string;
  businessType: BusinessType | null;
  firstName: string;
  age: string;
  sex: Sex;
  heightCm: string;
  weightKg: string;
  goals: Goal[];
  activityLevel: ActivityLevel | null;
  tracking: TrackPreference[];
  // QA 12.0: opted into a recovery-sensitive experience during onboarding.
  recoverySensitive: boolean;
  // V5 (QA 5.0): professional's certification upload (camera or file), data URL.
  certificationFile: string | null;
}

const initialDraft: OnboardingDraft = {
  email: "",
  accountType: null,
  customerSubtype: null,
  professionalSubtype: null,
  professionalUserIdCode: "",
  businessName: "",
  businessType: null,
  firstName: "",
  age: "",
  sex: "female",
  heightCm: "",
  weightKg: "",
  goals: [],
  activityLevel: null,
  tracking: [],
  recoverySensitive: false,
  certificationFile: null,
};

type StepKey =
  | "welcome"
  | "auth"
  | "accountType"
  | "aboutYou"
  | "goal"
  | "activity"
  | "recovery"
  | "tracking"
  | "ready";

// V4 (QA 4.0): professionals are onboarding to add clients, not to be
// tracked themselves — the goal/activity-level/tracking-preference steps
// are customer-only questions, so professionals skip straight from About
// You to the finish screen (coaching-app style onboarding, not a client
// health-tracking wizard).
// V7 (QA 7.0): a "Client of Professional" with a valid code skips About You
// entirely — their name/age/height/sex/weight come from what the
// professional already entered when generating that code.
function stepsFor(accountType: OnboardingDraft["accountType"], skipAboutYou: boolean): StepKey[] {
  const isProfessional = accountType === "professional";
  // V7 (QA 7.0): a business isn't a person to profile/track either — same
  // "land straight past the personal-tracking questions" treatment as a
  // professional, since business-type selection (on AccountTypeStep) is
  // its own equivalent of the professional's specialty picker.
  const isBusiness = accountType === "business";
  return [
    "welcome",
    "auth",
    "accountType",
    ...(skipAboutYou || isBusiness ? [] : (["aboutYou"] as StepKey[])),
    // QA 13.0: "It would make sense to have the recovery sensitive
    // experience before the 'How active are you?' and 'what are you working
    // towards' page" — recovery-sensitive is now asked first so those two
    // steps can already read `draft.recoverySensitive` when they render.
    ...(isProfessional || isBusiness ? [] : (["recovery", "goal", "activity", "tracking"] as StepKey[])),
    "ready",
  ];
}

// Sign-up sends the user out to their email client to click a confirmation
// link, and they come back on a fresh page load. Without this the draft —
// plain component state — would be gone, dropping them back at Welcome with
// nothing filled in. Persisting it means they return to exactly the step
// they left.
const DRAFT_KEY = "centium-onboarding:draft";
const STEP_KEY = "centium-onboarding:step";

function loadDraft(): OnboardingDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    // Merged over the current defaults so a draft saved before a new field
    // existed doesn't come back with it undefined.
    return raw ? { ...initialDraft, ...(JSON.parse(raw) as Partial<OnboardingDraft>) } : initialDraft;
  } catch {
    return initialDraft;
  }
}

function loadStep(): number {
  const parsed = Number(localStorage.getItem(STEP_KEY));
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function clearPersistedDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(STEP_KEY);
  } catch {
    /* nothing to clean up */
  }
}

export default function Onboarding() {
  const [step, setStep] = useState(loadStep);
  const [draft, setDraft] = useState<OnboardingDraft>(loadDraft);
  const {
    completeOnboarding,
    redeemClientCode,
    clientCodes,
    setRecoverySensitive,
    setRecoverySensitiveIntroSeen,
    authUserId,
  } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      localStorage.setItem(STEP_KEY, String(step));
    } catch {
      // A full or disabled localStorage only costs the resume-after-email
      // convenience — onboarding itself still works in-session.
    }
  }, [draft, step]);

  const matchedClientCode = clientCodes.find(
    (c) => c.code.toUpperCase() === draft.professionalUserIdCode.trim().toUpperCase()
  );
  const skipAboutYou = draft.customerSubtype === "client" && !!matchedClientCode;

  const steps = stepsFor(draft.accountType, skipAboutYou);
  const stepKey = steps[Math.min(step, steps.length - 1)];

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const isProfessional = draft.accountType === "professional";

  const finish = async () => {
    // Resolved once so the local state and the remote profiles row are
    // written from exactly the same values — a client who skipped About You
    // gets their details from the professional's code, everyone else from
    // what they typed, and both writes agree.
    const accountType: AccountType = draft.accountType || "customer";
    const resolved = {
      email: draft.email,
      accountType,
      customerSubtype:
        accountType === "customer" ? draft.customerSubtype || ("general" as CustomerSubtype) : undefined,
      professionalSubtype:
        accountType === "professional"
          ? draft.professionalSubtype || ("other" as ProfessionalSubtype)
          : undefined,
      firstName: matchedClientCode?.clientName || draft.firstName || "Friend",
      age: matchedClientCode?.clientAge ?? (Number(draft.age) || 28),
      sex: matchedClientCode?.clientSex ?? draft.sex,
      heightCm: matchedClientCode?.clientHeightCm ?? (Number(draft.heightCm) || 170),
      weightKg: matchedClientCode?.clientWeightKg ?? (Number(draft.weightKg) || 70),
      goals: draft.goals.length ? draft.goals : (["improve_health"] as Goal[]),
      activityLevel: draft.activityLevel || ("moderate" as ActivityLevel),
      tracking: draft.tracking.length ? draft.tracking : (["nutrition", "workouts"] as TrackPreference[]),
    };

    completeOnboarding({
      ...resolved,
      businessName: accountType === "business" ? draft.businessName : undefined,
      businessType: accountType === "business" ? draft.businessType || "gym" : undefined,
      certificationUrl: draft.certificationFile ?? undefined,
    });

    // Phase 2 of the profiles write: the row itself was created the moment
    // the session appeared (see ensureProfileRow in AppContext); this fills
    // in everything that only exists now that onboarding has run.
    //
    // Best-effort and deliberately not blocking navigation on failure — the
    // UI reads local state today, so a network blip here must not strand the
    // user on the final step with no way forward.
    if (authUserId) {
      await updateProfileFromOnboarding(authUserId, resolved);
    }

    if (draft.customerSubtype === "client" && draft.professionalUserIdCode.trim()) {
      redeemClientCode(draft.professionalUserIdCode);
    }
    // QA 12.0: "When accessing the account for the first time an initial
    // prompt should state you are in recovery sensitive mode... it can be
    // toggled off in the settings whenever without losing any data."
    if (draft.recoverySensitive) {
      setRecoverySensitive(true);
      setRecoverySensitiveIntroSeen(false);
    }
    // Onboarding is done, so the resume-after-email draft has served its
    // purpose — leaving it behind would restore a stale half-filled flow the
    // next time this route is opened.
    clearPersistedDraft();
    // Professionals land straight in their client dashboard — mirroring a
    // coaching app's first-run flow — instead of the consumer Home page.
    navigate(isProfessional ? "/app/professionals" : "/app");
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Design refinement (canvas turn 2 note): "Onboarding's step bar
          tightens to 3px with the completed span in one continuous
          lavender run." */}
      {step > 0 && (
        <div className="px-6 pt-6 flex items-center gap-1">
          {Array.from({ length: steps.length - 1 }).map((_, i) => (
            <div
              key={i}
              className="h-[3px] flex-1 rounded-full transition-colors duration-300"
              style={{ background: i <= step - 1 ? "rgb(var(--c-primary))" : "rgb(var(--c-cream-soft))" }}
            />
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-col px-6 pt-8 pb-10 max-w-md mx-auto w-full">
        {stepKey === "welcome" && <WelcomeStep onNext={next} />}
        {stepKey === "auth" && <AuthStep draft={draft} setDraft={setDraft} onNext={next} />}
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
        {stepKey === "recovery" && (
          <RecoveryStep draft={draft} setDraft={setDraft} onNext={next} onBack={back} />
        )}
        {stepKey === "tracking" && (
          <TrackingStep draft={draft} setDraft={setDraft} onNext={next} onBack={back} />
        )}
        {stepKey === "ready" && <ReadyStep draft={draft} onFinish={finish} isProfessional={isProfessional} />}
      </div>
    </div>
  );
}
