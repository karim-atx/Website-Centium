import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { updateProfileFromOnboarding } from "../../services/profile";
import { redeemClientCode } from "../../services/redemption";
import { ageFromDateOfBirth } from "../../utils/date";
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
import { SubtypeStep } from "./SubtypeStep";
import { dateOfBirthComplete, dateOfBirthStep, resumeIndex, stepsFor } from "./onboardingSteps";
import { legacyStoredDraft, parseStoredDraft, resolveDraft, type StoredDraft, type Viewer } from "./draftOwner";
import { DobStep } from "./DobStep";
import { AboutYouStep } from "./AboutYouStep";
import { BackgroundStep } from "./BackgroundStep";
import { GoalStep } from "./GoalStep";
import { ActivityStep } from "./ActivityStep";
import { RecoveryStep } from "./RecoveryStep";
import { TrackingStep } from "./TrackingStep";
import { ReadyStep } from "./ReadyStep";
import { hasReturnedAuthError } from "../../services/auth";

export interface OnboardingDraft {
  email: string;
  accountType: AccountType | null;
  customerSubtype: CustomerSubtype | null;
  professionalSubtype: ProfessionalSubtype | null;
  professionalUserIdCode: string;
  // Filled in by AccountTypeStep from preview_client_code(). Carried to
  // finish() so the linked-professional details shown around the client UI
  // come from the real code preview rather than the snapshot fields the mock
  // used to copy.
  clientCodeProfessional: {
    id: string;
    firstName: string;
    avatarUrl: string | null;
    subtype: ProfessionalSubtype;
  } | null;
  businessName: string;
  businessType: BusinessType | null;
  firstName: string;
  dateOfBirth: string;
  sex: Sex;
  heightCm: string;
  weightKg: string;
  goals: Goal[];
  activityLevel: ActivityLevel | null;
  tracking: TrackPreference[];
  // QA 12.0: opted into a recovery-sensitive experience during onboarding.
  recoverySensitive: boolean;
  // The professional's certificate: the storage PATH (not the bytes), read
  // back from the server on About you and written there at pick time.
  certificationFile: string | null;
}

const initialDraft: OnboardingDraft = {
  email: "",
  accountType: null,
  customerSubtype: null,
  professionalSubtype: null,
  professionalUserIdCode: "",
  clientCodeProfessional: null,
  businessName: "",
  businessType: null,
  firstName: "",
  dateOfBirth: "",
  sex: "female",
  heightCm: "",
  weightKg: "",
  goals: [],
  activityLevel: null,
  tracking: [],
  recoverySensitive: false,
  certificationFile: null,
};

// Sign-up sends the user out to their email client to click a confirmation
// link, and they come back on a fresh page load. Without this the draft —
// plain component state — would be gone, dropping them back at Welcome with
// nothing filled in. Persisting it means they return to exactly the step
// they left.
//
// THE DRAFT HAS AN OWNER. It used to be one ownerless key, so a second
// sign-up in this browser resumed the first person's answers, including a
// date of birth that locks once saved. Now one record holds the answers, the
// step and the user id they belong to (null = started before any account
// existed), and draftOwner.resolveDraft decides who may resume it.
// The two old ownerless keys are read once (as a legacy draft) and removed.
const STORE_KEY = "centium-onboarding:state";
const LEGACY_DRAFT_KEY = "centium-onboarding:draft";
const LEGACY_STEP_KEY = "centium-onboarding:step";

function readStoredDraft(): StoredDraft<OnboardingDraft> | null {
  try {
    return parseStoredDraft<OnboardingDraft>(localStorage.getItem(STORE_KEY));
  } catch {
    return null;
  }
}

/** A draft saved by the old ownerless keys, if one is still here. */
function readLegacyDraft(): StoredDraft<OnboardingDraft> | null {
  try {
    return legacyStoredDraft<OnboardingDraft>(localStorage.getItem(LEGACY_DRAFT_KEY), localStorage.getItem(LEGACY_STEP_KEY));
  } catch {
    return null;
  }
}

function clearPersistedDraft() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("centium-onboarding:"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* nothing to clean up */
  }
}

/**
 * The draft this viewer starts with: their own saved one if resolveDraft
 * allows it, otherwise an empty one owned by them. Read-only (no storage
 * writes), because React may call a state initializer twice.
 */
function initialStateFor(viewer: Viewer): { draft: OnboardingDraft; step: number; owner: string | null } {
  const authStep = stepsFor(null, false).indexOf("auth");
  // An old ownerless draft is only ever offered to a signed-in account, and
  // first: resolveDraft adopts it only if it carries that account's email.
  // Signed out, it is left where it is for its owner to sign back in to.
  const legacy = viewer.userId ? resolveDraft(readLegacyDraft(), viewer) : ({ use: false } as const);
  const resolved = legacy.use ? legacy : resolveDraft(readStoredDraft(), viewer);
  if (!resolved.use) {
    // A sign-in that came back refused opens on the auth step, where it is explained.
    return { draft: initialDraft, step: hasReturnedAuthError() ? authStep : 0, owner: viewer.userId };
  }
  // Merged over the current defaults so a draft saved before a new field
  // existed doesn't come back with it undefined. Signed in, the email is the
  // account's own, as the auth step has always set it.
  const draft: OnboardingDraft = {
    ...initialDraft,
    ...resolved.draft,
    ...(viewer.userId && viewer.email ? { email: viewer.email } : {}),
  };
  if (hasReturnedAuthError()) return { draft, step: authStep, owner: resolved.owner };
  let step = resumeIndex(resolved.step, draft, false);
  // Signed in on the auth step: that step is done. It used to advance itself
  // when the session arrived; this flow remounts for the new account instead,
  // so the remount carries on from where the sign-up was.
  const steps = stepsFor(draft.accountType, false);
  if (viewer.userId && steps[step] === "auth") step = steps.indexOf("accountType");
  return { draft, step, owner: resolved.owner };
}

/**
 * ONE MOUNT PER ACCOUNT. The flow is keyed by the signed-in user id, so a
 * different account (signing in here, or after a sign-out) gets a fresh
 * mount that reads only its own draft. Nothing from another account's draft
 * is ever in memory to be shown or submitted. Rendered once auth has
 * settled, so a reload is not mistaken for a signed-out visitor.
 */
export default function Onboarding() {
  const { authReady, authUserId, session } = useApp();
  if (!authReady) return <div className="min-h-[100dvh] bg-cream" />;
  const viewer: Viewer = { userId: authUserId, email: session?.user?.email ?? null };
  return <OnboardingFlow key={authUserId ?? "signed-out"} viewer={viewer} />;
}

function OnboardingFlow({ viewer }: { viewer: Viewer }) {
  const [initial] = useState(() => initialStateFor(viewer));
  const [draft, setDraft] = useState<OnboardingDraft>(initial.draft);
  const [step, setStep] = useState(initial.step);
  const owner = initial.owner;
  const {
    completeOnboarding,
    updateProfile,
    setRecoverySensitive,
    setRecoverySensitiveIntroSeen,
    authUserId,
  } = useApp();
  const navigate = useNavigate();
  // Set when the client code fails at the last step. Onboarding is already
  // saved at that point, so this is shown on the Ready screen and the user
  // continues into the app on a second tap.
  const [finishNotice, setFinishNotice] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  /** Task T: the server refused or missed the final save; nothing is onboarded yet. */
  const [finishError, setFinishError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({ v: 2, owner, draft, step: stepsFor(draft.accountType, false)[step] ?? "welcome" })
      );
      // The old ownerless keys were judged at this signed-in mount (adopted
      // or not this account's), so they go now. A signed-out mount leaves
      // them for their owner.
      if (owner !== null) {
        localStorage.removeItem(LEGACY_DRAFT_KEY);
        localStorage.removeItem(LEGACY_STEP_KEY);
      }
    } catch {
      // A full or disabled localStorage only costs the resume-after-email
      // convenience — onboarding itself still works in-session.
    }
  }, [draft, step, owner]);

  // See the note on stepsFor: a real client code carries no client profile
  // data, so there is nothing to prefill and nothing to skip.
  const skipAboutYou = false;

  const steps = stepsFor(draft.accountType, skipAboutYou);
  const stepKey = steps[Math.min(step, steps.length - 1)];

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const isProfessional = draft.accountType === "professional";

  const finish = async () => {
    // A second tap after a code failure just proceeds — the notice has been
    // read, and everything except the code was already saved on the first pass.
    if (finishNotice) {
      clearPersistedDraft();
      navigate(isProfessional ? "/app/professionals" : "/app");
      return;
    }
    if (finishing) return;

    // Task T: no account is finished without a date of birth (16+). The
    // steps already require it; this catches a draft that got here without
    // one, and sends it back to the step that asks.
    if (!dateOfBirthComplete(draft)) {
      const at = steps.indexOf(dateOfBirthStep(draft.accountType));
      if (at >= 0) setStep(at);
      return;
    }
    if (!authUserId) {
      setFinishError("You're signed out. Go back and sign in again to finish.");
      return;
    }
    setFinishing(true);
    setFinishError(null);

    // Resolved once so the local state and the remote profiles row are
    // written from exactly the same values.
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
      firstName: draft.firstName || "Friend",
      dateOfBirth: draft.dateOfBirth,
      // Derived, not entered. Kept on the local profile because TDEE and the
      // biomarker screening recommendations take a number — but the date is
      // what's stored, so this recomputes correctly on every hydration
      // instead of freezing at signup.
      age: ageFromDateOfBirth(draft.dateOfBirth) ?? 28,
      sex: draft.sex,
      heightCm: Number(draft.heightCm) || 170,
      weightKg: Number(draft.weightKg) || 70,
      goals: draft.goals.length ? draft.goals : (["improve_health"] as Goal[]),
      activityLevel: draft.activityLevel || ("moderate" as ActivityLevel),
      tracking: draft.tracking.length ? draft.tracking : (["nutrition", "workouts"] as TrackPreference[]),
    };

    // THE SERVER FIRST, then the device (task T). The profiles row was
    // created when the session appeared (ensureProfileRow in AppContext);
    // this fills it in and sets onboarded. It used to be best-effort and run
    // after the device was already marked onboarded, so a refused save left
    // the server saying "not onboarded" and every later load sent the user
    // back here with no explanation. Now a failure is shown and retried, and
    // nothing local changes until the server has said yes.
    const saved = await updateProfileFromOnboarding(authUserId, resolved);
    if (!saved.ok) {
      setFinishing(false);
      setFinishError(saved.message ?? "Couldn't finish setting up your account. Try again.");
      return;
    }

    completeOnboarding({
      ...resolved,
      businessName: accountType === "business" ? draft.businessName : undefined,
      businessType: accountType === "business" ? draft.businessType || "gym" : undefined,
      certificationUrl: draft.certificationFile ?? undefined,
    });

    // Redeem the client code for real. Everything the RPC can do is handled:
    // a thrown/transport failure, a raised error (not authenticated, or the
    // ATX02 rate limit whose message carries a retry hint), and a returned
    // success:false for the business-logic failures that do NOT raise —
    // wrong code, expired, already redeemed, professional at capacity.
    if (draft.customerSubtype === "client" && draft.professionalUserIdCode.trim()) {
      const result = await redeemClientCode(draft.professionalUserIdCode);

      if (result.status === "success") {
        // The relationship is a real professional_clients row now. These
        // fields are only the display copy the client UI already reads —
        // sourced from the code preview, not from snapshot columns.
        const pro = draft.clientCodeProfessional;
        if (pro) {
          updateProfile({
            linkedProfessionalCode: draft.professionalUserIdCode.trim().toUpperCase(),
            linkedProfessionalName: pro.firstName,
            linkedProfessionalSubtype: pro.subtype,
          });
        }
      } else {
        // A failure here must not trap the user on the last step — they've
        // already completed onboarding and their profile is written. They
        // continue as a regular customer and are told why, rather than being
        // blocked by a code that went stale between the preview and now.
        setFinishNotice(
          result.status === "error"
            ? result.message
            : `${result.message} You can add a professional later from the Professionals tab.`
        );
        setFinishing(false);
        return;
      }
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
    <div className="min-h-[100dvh] bg-cream flex flex-col">
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
        {stepKey === "subtype" && (
          <SubtypeStep draft={draft} setDraft={setDraft} onNext={next} onBack={back} />
        )}
        {stepKey === "aboutYou" && (
          <AboutYouStep draft={draft} setDraft={setDraft} onNext={next} onBack={back} />
        )}
        {stepKey === "dateOfBirth" && (
          <DobStep draft={draft} setDraft={setDraft} onNext={next} onBack={back} />
        )}
        {stepKey === "background" && <BackgroundStep onNext={next} onBack={back} />}
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
        {stepKey === "ready" && (
          <ReadyStep
            draft={draft}
            onFinish={finish}
            isProfessional={isProfessional}
            notice={finishNotice}
            error={finishError}
            busy={finishing}
          />
        )}
      </div>
    </div>
  );
}
