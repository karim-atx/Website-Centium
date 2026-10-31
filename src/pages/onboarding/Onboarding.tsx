import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { BIZ_FLOW_STEPS, dateOfBirthComplete, dateOfBirthStep, laneOf, resumeIndex, stepsFor, type StepKey } from "./onboardingSteps";
import { BusinessLane, type BizLaneFlowKey } from "./business/BusinessLane";
import { emptyBusinessDraft, mirrorFields, type BusinessLaneDraft } from "./business/draft";
import { legacyStoredDraft, parseStoredDraft, resolveDraft, type StoredDraft, type Viewer } from "./draftOwner";
import { hasReturnedAuthError } from "../../services/auth";
import { AboutStep } from "./client/AboutStep";
import { GentleStep } from "./client/GentleStep";
import { GoalsStep } from "./client/GoalsStep";
import { TrackStep } from "./client/TrackStep";
import { ClientReadyStep } from "./client/ClientReadyStep";
import { ProLane } from "./pro/ProLane";
import { PRO_FLOW_STEPS, type ProFlowStep, type ProLaneDraft } from "./pro/proModel";
import { activitiesToSave, goalsToSave, trackingToSave, type GoalArea } from "./client/clientModel";
import { OnboardingFlowContext, OB_STRINGS, useOnline, type OnboardingFlowApi } from "./shell/flow";
import { ObPage, ObSkeleton, ObToast, useObToast, ObProgress, ObLockup } from "./shell/ObShell";
import { deleteDrafts, listDrafts, saveDraft } from "../../services/onboarding/drafts";
import { recordLegalAcceptances, LEGAL_VERSION, type LegalDocument } from "../../services/legal/acceptances";
import { savePreferredActivities } from "../../services/onboarding/clientProfile";
import { OFFLINE_MESSAGE } from "../../services/network-error";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { t } from "../../i18n/core";

export interface OnboardingDraft {
  email: string;
  accountType: AccountType | null;
  customerSubtype: CustomerSubtype | null;
  professionalSubtype: ProfessionalSubtype | null;
  professionalUserIdCode: string;
  // Filled in by AccountTypeStep from preview_client_code(). Carried to
  // finish() so the linked-professional details come from the real preview.
  clientCodeProfessional: {
    id: string;
    firstName: string;
    avatarUrl: string | null;
    subtype: ProfessionalSubtype;
  } | null;
  businessName: string;
  businessType: BusinessType | null;
  /** B5: the business_profiles row once a business lane has created it (the server draft needs it). */
  businessId: string | null;
  firstName: string;
  dateOfBirth: string;
  sex: Sex;
  heightCm: string;
  weightKg: string;
  /** v6 About you: the unit each field is shown in (stored metric either way). */
  heightUnit: "cm" | "ft";
  weightUnit: "kg" | "lb";
  goals: Goal[];
  /** v6 Goals and activity: up to 3 areas, and the sub-goals picked on each area's Refine sheet. */
  goalAreas: GoalArea[];
  subGoals: Partial<Record<GoalArea, string[]>>;
  activityLevel: ActivityLevel | null;
  /** v6: Activities you enjoy (clientModel ACTIVITIES keys). */
  activities: string[];
  tracking: TrackPreference[];
  /** v6 What to track: false until the user changes a row, so the recommended set follows their choices. */
  trackingTouched: boolean;
  // QA 12.0: opted into a recovery-sensitive experience during onboarding.
  recoverySensitive: boolean;
  /** v6 A gentler start, toggle 2: cycle tracking (V6-153: offered to everyone). */
  cycleTracking: boolean;
  /** B5 legal_acceptances: when Terms + Privacy were accepted in this flow, and which version. */
  legalAcceptedAt: string | null;
  legalVersion: string | null;
  // The professional's certificate: the storage PATH (not the bytes).
  certificationFile: string | null;
  /** v6 professional lane (Batch 3 · OB-B): the lane's answers (pro/proLane.ts). */
  pro: ProLaneDraft | null;
  /** v6 business lanes (Batch 3 · OB-C): the lane's answers (business/draft.ts). businessName / businessType / businessId mirror it. */
  biz: BusinessLaneDraft | null;
}

export const initialDraft: OnboardingDraft = {
  email: "",
  accountType: null,
  customerSubtype: null,
  professionalSubtype: null,
  professionalUserIdCode: "",
  clientCodeProfessional: null,
  businessName: "",
  businessType: null,
  businessId: null,
  firstName: "",
  dateOfBirth: "",
  sex: "female",
  heightCm: "",
  weightKg: "",
  heightUnit: "cm",
  weightUnit: "kg",
  goals: [],
  goalAreas: [],
  subGoals: {},
  activityLevel: null,
  activities: [],
  tracking: [],
  trackingTouched: false,
  recoverySensitive: false,
  cycleTracking: false,
  legalAcceptedAt: null,
  legalVersion: null,
  certificationFile: null,
  pro: null,
  biz: null,
};

// THE DRAFT, v6 (B5). A signed-in account's draft lives on the server
// (onboarding_drafts, one per profile and lane), so "Save and exit" survives
// another device, cleared site data and a sign-in redirect. The device copy
// stays for two jobs only: the draft started before any account exists
// (sign-up leaves for the confirmation email and comes back on a fresh page
// load) and the offline cache ("pending" until the server has it). An
// existing device draft is migrated to the server once, the first time its
// owner signs in.
//
// THE DRAFT HAS AN OWNER (draftOwner.resolveDraft): one record holds the
// answers, the step and the user id they belong to (null = started before any
// account existed), so a second sign-up in this browser never resumes the
// first person's answers. The two old ownerless keys are read once and removed.
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

function readLegacyDraft(): StoredDraft<OnboardingDraft> | null {
  try {
    return legacyStoredDraft<OnboardingDraft>(localStorage.getItem(LEGACY_DRAFT_KEY), localStorage.getItem(LEGACY_STEP_KEY));
  } catch {
    return null;
  }
}

function writeLocal(owner: string | null, draft: OnboardingDraft, step: string, pending: boolean) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ v: 2, owner, draft, step, savedAt: new Date().toISOString(), pending }));
  } catch {
    // A full or disabled localStorage only costs the device copy.
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

const merged = (d: Partial<OnboardingDraft>, viewer: Viewer): OnboardingDraft => ({
  ...initialDraft,
  ...d,
  ...(viewer.userId && viewer.email ? { email: viewer.email } : {}),
});

/** Where a draft resumes, with the auth step counted as done once signed in. */
function startStep(stored: string | null, draft: OnboardingDraft, viewer: Viewer): number {
  let step = resumeIndex(stored, draft, false);
  const steps = stepsFor(draft.accountType, false);
  if (viewer.userId && steps[step] === "auth") step = steps.indexOf("accountType");
  return step;
}

/**
 * The draft this viewer starts with from THIS DEVICE: their own saved one if
 * resolveDraft allows it, otherwise an empty one owned by them. Read-only.
 */
function initialStateFor(viewer: Viewer): { draft: OnboardingDraft; step: number; owner: string | null; local: StoredDraft<OnboardingDraft> | null } {
  const authStep = stepsFor(null, false).indexOf("auth");
  const legacyRec = viewer.userId ? readLegacyDraft() : null;
  const legacy = viewer.userId ? resolveDraft(legacyRec, viewer) : ({ use: false } as const);
  const localRec = readStoredDraft();
  const resolved = legacy.use ? legacy : resolveDraft(localRec, viewer);
  if (!resolved.use) {
    return { draft: merged({}, viewer), step: hasReturnedAuthError() ? authStep : 0, owner: viewer.userId, local: null };
  }
  const draft = merged(resolved.draft, viewer);
  if (hasReturnedAuthError()) return { draft, step: authStep, owner: resolved.owner, local: legacy.use ? legacyRec : localRec };
  return { draft, step: startStep(resolved.step, draft, viewer), owner: resolved.owner, local: legacy.use ? legacyRec : localRec };
}

/**
 * ONE MOUNT PER ACCOUNT. The flow is keyed by the signed-in user id, so a
 * different account gets a fresh mount that reads only its own draft.
 * Rendered once auth has settled, so a reload is not mistaken for a
 * signed-out visitor.
 */
export default function Onboarding() {
  const { authReady, authUserId, session } = useApp();
  if (!authReady) return <div className="min-h-[100dvh] bg-cream" />;
  const viewer: Viewer = { userId: authUserId, email: session?.user?.email ?? null };
  return <OnboardingFlow key={authUserId ?? "signed-out"} viewer={viewer} />;
}

function OnboardingFlow({ viewer }: { viewer: Viewer }) {
  // The signed-in account's address (draft.email is only typed on the auth
  // step, which an already signed-in visitor skips through "You're signed in").
  const { session: liveSession } = useApp();
  const viewerEmail = liveSession?.user?.email ?? viewer.email ?? "";
  // ?auth=signin|forgot (the reset page links back here): a signed-out
  // visitor opens straight on that auth screen.
  const [authLink] = useState(() => {
    const v = new URLSearchParams(window.location.search).get("auth");
    return !viewer.userId && (v === "signin" || v === "forgot") ? v : null;
  });
  const [initial] = useState(() => {
    const s0 = initialStateFor(viewer);
    return authLink ? { ...s0, step: stepsFor(s0.draft.accountType, false).indexOf("auth") } : s0;
  });
  const [draft, setDraft] = useState<OnboardingDraft>(initial.draft);
  const [step, setStep] = useState(initial.step);
  const owner = initial.owner;
  const {
    completeOnboarding,
    updateProfile,
    setRecoverySensitive,
    setRecoverySensitiveIntroSeen,
    setCycleTracking,
    signOut,
    authUserId,
  } = useApp();
  const navigate = useNavigate();
  const online = useOnline();
  const reduced = useReducedMotion();
  const [toast, showToast] = useObToast();
  // Welcome's two ways in: Get started (after the logo animation) opens
  // Create your account; "I already have an account" opens Sign in.
  const [authMode, setAuthMode] = useState<"signIn" | "signUp" | "forgot">(authLink === "forgot" ? "forgot" : "signIn");
  // Set when the client code fails at the last step: onboarding is saved,
  // so this is shown on You're all set and the user continues on a second tap.
  const [finishNotice, setFinishNotice] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  /** Task T: the server refused or missed the final save; nothing is onboarded yet. */
  const [finishError, setFinishError] = useState<string | null>(null);

  // ---- The server draft (B5) ---------------------------------------------
  // Signed in, the server copy is read before the flow shows, so a draft
  // saved on another device resumes on its step. Until it answers, the step
  // frame shows its loading state (OURS-step-states row 1).
  const [serverReady, setServerReady] = useState(!viewer.userId);
  useEffect(() => {
    const uid = viewer.userId;
    if (!uid) return;
    let cancelled = false;
    // A slow or unreachable server never holds the flow: after 4 s the device
    // copy is used (the server copy is then written over by the next save).
    let timedOut = false;
    const giveUp = window.setTimeout(() => {
      timedOut = true;
      if (!cancelled) setServerReady(true);
    }, 4000);
    void listDrafts(uid).then((r) => {
      window.clearTimeout(giveUp);
      if (cancelled || timedOut) return;
      if (r.ok && r.value.length > 0) {
        const newest = r.value[0];
        const local = initial.local;
        const localNewer =
          !!local && local.owner === uid && local.pending === true && !!local.savedAt && local.savedAt > newest.updatedAt;
        if (!localNewer) {
          const payload = newest.payload as { draft?: Partial<OnboardingDraft> };
          const d = merged(payload.draft ?? {}, viewer);
          setDraft(d);
          setStep(startStep(newest.stepKey, d, viewer));
        }
      }
      // No server draft: whatever this device has (if anything) is written
      // up by the persistence effect below, once: the one-time migration.
      setServerReady(true);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(giveUp);
    };
    // Once per mount (per account).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the draft's email equal to the account's, for every lane.
  useEffect(() => {
    if (viewerEmail) setDraft((d) => (d.email === viewerEmail ? d : { ...d, email: viewerEmail }));
  }, [viewerEmail]);

  const steps = stepsFor(draft.accountType, false);
  const stepKey: StepKey = steps[Math.min(step, steps.length - 1)];
  const lane = laneOf(draft.accountType);

  // ---- Persistence: device copy now, server copy shortly after ------------
  const saveTimer = useRef<number | undefined>(undefined);
  const lastSaved = useRef<string>("");
  const syncNow = useCallback(async (): Promise<boolean> => {
    if (!owner || !lane) return true;
    if (lane === "business" && !draft.businessId) return true;
    const body = JSON.stringify({ draft, stepKey });
    const r = await saveDraft(owner, lane, stepKey, { v: 3, draft }, draft.businessId);
    if (r.ok) {
      lastSaved.current = body;
      writeLocal(owner, draft, stepKey, false);
      return true;
    }
    return false;
  }, [owner, lane, draft, stepKey]);

  useEffect(() => {
    if (!serverReady) return;
    writeLocal(owner, draft, stepKey, true);
    // The old ownerless keys were judged at this signed-in mount, so they go now.
    if (owner !== null) {
      try {
        localStorage.removeItem(LEGACY_DRAFT_KEY);
        localStorage.removeItem(LEGACY_STEP_KEY);
      } catch {
        /* nothing */
      }
    }
    if (!owner || !lane || !online) return;
    if (JSON.stringify({ draft, stepKey }) === lastSaved.current) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void syncNow(), 600);
    return () => window.clearTimeout(saveTimer.current);
  }, [draft, stepKey, owner, lane, online, serverReady, syncNow]);

  // Back online: flush the device copy and say so (OURS-step-states row 5).
  const wasOnline = useRef(online);
  useEffect(() => {
    if (online && !wasOnline.current) {
      void syncNow();
      if (step > steps.indexOf("auth")) showToast(t(OB_STRINGS.backOnline));
    }
    wasOnline.current = online;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // ---- Step transition (motion/step-transition) ----------------------------
  const [leaving, setLeaving] = useState(false);
  const leave = useCallback(
    (then: () => void) => {
      if (reduced) {
        then();
        window.scrollTo(0, 0);
        return;
      }
      setLeaving(true);
      window.setTimeout(() => {
        then();
        setLeaving(false);
        window.scrollTo(0, 0);
      }, 180);
    },
    [reduced]
  );
  const next = () => leave(() => setStep((s) => Math.min(s + 1, steps.length - 1)));
  const back = () => leave(() => setStep((s) => Math.max(s - 1, 0)));
  // The auth step advances itself when a session arrives; no transition out
  // of a screen that is already being replaced by a remount.
  const nextNow = useCallback(() => setStep((s) => s + 1), []);

  const saveAndExit = useCallback(async (): Promise<{ ok: true } | { ok: false; message: string }> => {
    if (!online) {
      // Offline: the device copy is the draft. Signing out would clear it
      // (signOut removes this device's drafts), so leave without signing out;
      // reopening the app on this device resumes this step.
      writeLocal(owner, draft, stepKey, true);
      navigate("/");
      return { ok: true };
    }
    const ok = await syncNow();
    if (!ok) return { ok: false, message: t(OB_STRINGS.finishLaterError) };
    await signOut();
    return { ok: true };
  }, [online, owner, draft, stepKey, navigate, syncNow, signOut]);

  const flow: OnboardingFlowApi = useMemo(() => ({ saveAndExit, online, leave, leaving }), [saveAndExit, online, leave, leaving]);

  const isProfessional = draft.accountType === "professional";

  const finish = async (): Promise<{ ok: boolean; message?: string }> => {
    // A second tap after a code failure just proceeds: everything except
    // the code was already saved on the first pass.
    if (finishNotice) {
      clearPersistedDraft();
      if (authUserId) void deleteDrafts(authUserId);
      navigate(isProfessional ? "/app/pro" : "/app");
      return { ok: true };
    }
    if (finishing) return { ok: false };

    // Task T: no account is finished without a date of birth (16+).
    if (!dateOfBirthComplete(draft)) {
      const at = steps.indexOf(dateOfBirthStep(draft.accountType));
      if (at >= 0) setStep(at);
      return { ok: false };
    }
    if (!authUserId) {
      setFinishError(t("You're signed out. Go back and sign in again to finish."));
      return { ok: false, message: t("You're signed out. Go back and sign in again to finish.") };
    }
    setFinishing(true);
    setFinishError(null);

    const accountType: AccountType = draft.accountType || "customer";
    const isClient = accountType === "customer";
    const flags = { rs: draft.recoverySensitive, cy: draft.cycleTracking };

    // B5 legal_acceptances: Terms + Privacy (accepted on Create your account,
    // or on You're all set for a Google sign-up), and the health disclaimer
    // shown on You're all set. Recorded first: no account is set up without
    // its acceptance on record.
    if (isClient) {
      const docs: LegalDocument[] = ["health_disclaimer"];
      if (draft.legalAcceptedAt) docs.unshift("terms", "privacy");
      const legal = await recordLegalAcceptances(authUserId, docs, draft.legalVersion ?? LEGAL_VERSION);
      if (!legal.ok) {
        setFinishing(false);
        setFinishError(legal.offline ? t(OFFLINE_MESSAGE) : t("Couldn't finish setting up your account. Try again."));
        return { ok: false, message: legal.offline ? t(OFFLINE_MESSAGE) : t("Couldn't finish setting up your account. Try again.") };
      }
    }

    // Resolved once so the local state and the remote profiles row are
    // written from exactly the same values.
    const resolved = {
      // Signed in, the account's own address always wins: a flow entered through
      // "You're signed in → Continue" never typed one (every lane).
      email: viewerEmail || draft.email,
      accountType,
      customerSubtype: isClient ? draft.customerSubtype || ("general" as CustomerSubtype) : undefined,
      professionalSubtype: accountType === "professional" ? draft.professionalSubtype || ("other" as ProfessionalSubtype) : undefined,
      firstName: draft.firstName || "Friend",
      dateOfBirth: draft.dateOfBirth,
      // Derived, not entered; the date is what's stored.
      age: ageFromDateOfBirth(draft.dateOfBirth) ?? 28,
      sex: draft.sex,
      heightCm: Number(draft.heightCm) || 170,
      weightKg: Number(draft.weightKg) || 70,
      goals: isClient ? goalsToSave(draft.goalAreas, draft.subGoals, flags) : draft.goals.length ? draft.goals : (["improve_health"] as Goal[]),
      activityLevel: draft.activityLevel || ("moderate" as ActivityLevel),
      tracking: isClient
        ? trackingToSave(draft.tracking, flags)
        : draft.tracking.length
          ? draft.tracking
          : (["nutrition", "workouts"] as TrackPreference[]),
    };

    // THE SERVER FIRST, then the device (task T): nothing local changes until
    // the server has said yes.
    const saved = await updateProfileFromOnboarding(authUserId, resolved);
    if (!saved.ok) {
      setFinishing(false);
      setFinishError(saved.message ? t(saved.message) : t("Couldn't finish setting up your account. Try again."));
      return { ok: false, message: saved.message ? t(saved.message) : t("Couldn't finish setting up your account. Try again.") };
    }
    if (isClient && draft.activities.length) await savePreferredActivities(authUserId, activitiesToSave(draft.activities));

    completeOnboarding({
      ...resolved,
      businessName: accountType === "business" ? draft.businessName : undefined,
      businessType: accountType === "business" ? draft.businessType || "gym" : undefined,
      certificationUrl: draft.certificationFile ?? undefined,
    });

    // QA 12.0: the first open states the recovery-sensitive mode (intro
    // prompt), and it can be turned off in Settings without losing data.
    if (draft.recoverySensitive) {
      setRecoverySensitive(true);
      setRecoverySensitiveIntroSeen(false);
    }
    // V6-153: cycle tracking is offered to everyone; turning it on for a
    // profile not offered the section by sex also records the opt-in.
    if (isClient && draft.cycleTracking) await setCycleTracking(true);

    // Redeem the client code for real (every failure the RPC can return is
    // handled; a failure here never traps the user on the last step).
    if (draft.customerSubtype === "client" && draft.professionalUserIdCode.trim()) {
      const result = await redeemClientCode(draft.professionalUserIdCode);
      if (result.status === "success") {
        const pro = draft.clientCodeProfessional;
        if (pro) {
          updateProfile({
            linkedProfessionalCode: draft.professionalUserIdCode.trim().toUpperCase(),
            linkedProfessionalName: pro.firstName,
            linkedProfessionalSubtype: pro.subtype,
          });
        }
      } else {
        setFinishNotice(
          result.status === "error" ? t(result.message) : `${t(result.message)} ${t("You can add a professional later from the Professionals tab.")}`
        );
        setFinishing(false);
        return { ok: true };
      }
    }
    // Onboarding is done: the drafts have served their purpose. A business
    // keeps its own lane's draft: it was just submitted for review, and
    // /app/business/setup reads it for the listing preview and for "Fix and
    // resubmit" (and it holds the Essentials answers that have no column yet).
    clearPersistedDraft();
    if (accountType === "business") {
      void deleteDrafts(authUserId, "client");
      void deleteDrafts(authUserId, "professional");
      navigate("/app/business/setup");
      return { ok: true };
    }
    void deleteDrafts(authUserId);
    navigate(isProfessional ? "/app/pro" : "/app");
    return { ok: true };
  };

  if (!serverReady) {
    return (
      <ObPage>
        <div className="ob-body">
          <ObProgress count={4} index={0} variant="lane" />
          <div className="ob-head" data-m="lane" style={{ justifyContent: "center" }}>
            <ObLockup />
          </div>
          <ObSkeleton />
        </div>
      </ObPage>
    );
  }

  return (
    <OnboardingFlowContext.Provider value={flow}>
      {stepKey === "welcome" && (
        <WelcomeStep
          onGetStarted={() => {
            setAuthMode("signUp");
            setStep((s) => s + 1);
          }}
          onSignIn={() => {
            setAuthMode("signIn");
            leave(() => setStep((s) => s + 1));
          }}
        />
      )}
      {stepKey === "auth" && <AuthStep draft={draft} setDraft={setDraft} onNext={nextNow} initialMode={authMode} />}
      {stepKey === "accountType" && <AccountTypeStep draft={draft} setDraft={setDraft} onNext={next} onBack={back} />}
      {/* Client lane (v6, Batch 3) */}
      {stepKey === "about" && <AboutStep draft={draft} setDraft={setDraft} onNext={next} onBack={back} />}
      {stepKey === "gentle" && <GentleStep draft={draft} setDraft={setDraft} onNext={next} onBack={back} />}
      {stepKey === "goals" && <GoalsStep draft={draft} setDraft={setDraft} onNext={next} onBack={back} />}
      {stepKey === "track" && <TrackStep draft={draft} setDraft={setDraft} onNext={next} onBack={back} />}
      {stepKey === "ready" && draft.accountType === "customer" && (
        <ClientReadyStep draft={draft} setDraft={setDraft} onFinish={finish} notice={finishNotice} error={finishError} busy={finishing} />
      )}
      {/* Professional lane (v6, Batch 3 · OB-B): specialty, six steps, status screens */}
      {isProfessional && (PRO_FLOW_STEPS as readonly string[]).includes(stepKey) && (
        <ProLane
          stepKey={stepKey as ProFlowStep}
          draft={draft}
          setDraft={setDraft}
          onNext={next}
          onBack={back}
          goToStep={(k: ProFlowStep) => leave(() => setStep(steps.indexOf(k)))}
          onFinished={() => {
            clearPersistedDraft();
            if (authUserId) void deleteDrafts(authUserId);
          }}
        />
      )}
      {/* Business lanes (v6, Batch 3 · OB-C): type, six steps; after Submit for review, /app/business/setup */}
      {draft.accountType === "business" && (BIZ_FLOW_STEPS as readonly string[]).includes(stepKey) && (
        <BusinessLane
          stepKey={stepKey as BizLaneFlowKey}
          uid={authUserId}
          biz={draft.biz}
          setBiz={(f) =>
            setDraft((d) => {
              const b = f(d.biz ?? emptyBusinessDraft());
              const m = mirrorFields(b);
              return { ...d, biz: b, businessName: m.businessName, businessType: m.businessType as BusinessType | null, businessId: m.businessId };
            })
          }
          onNext={next}
          onBack={back}
          goToStep={(k) => leave(() => setStep(steps.indexOf(k)))}
          dob={draft.dateOfBirth}
          setDob={(v) => setDraft((d) => ({ ...d, dateOfBirth: v }))}
          dobLocked={false}
          onSubmitted={finish}
        />
      )}
      <ObToast message={toast} />
    </OnboardingFlowContext.Provider>
  );
}
