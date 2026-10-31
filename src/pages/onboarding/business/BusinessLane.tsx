import React, { useCallback, useEffect, useRef, useState } from "react";
import { useOnboardingFlow, useOnline, OB_STRINGS } from "../shell";
import { BusinessTypeStep } from "./BusinessTypeStep";
import { YourBusinessStep } from "./YourBusinessStep";
import { WhereWhenStep } from "./WhereWhenStep";
import { EssentialsStep } from "./EssentialsStep";
import { PoliciesStep } from "./PoliciesStep";
import { PaymentsStep } from "./PaymentsStep";
import { ReviewStep } from "./ReviewStep";
import { BIZ_STEPS, type BizFlowKey } from "./bizLanes";
import { emptyBusinessDraft, type BusinessLaneDraft } from "./draft";
import type { LaneStepProps } from "./laneTypes";
import {
  saveBusinessBasics,
  saveClassDefaults,
  saveOfferPlans,
  saveEntrySettings,
  savePolicyDrafts,
  saveStarterPlan,
  saveStoreSettings,
  saveVenues,
  submitForReview,
} from "../../../services/business-onboarding";
import { t } from "../../../i18n/core";

// The business lanes (Classes, Gym, Store) inside the onboarding flow: the
// type step ("bizType"), then the six numbered steps (bizBusiness … bizReview).
// The flow (Onboarding.tsx) owns the step position, the transition, the draft
// on this device and on the server (onboarding_drafts, B5), Finish later and
// finishing the account. This owns each step's server write (B5 tables), the
// offline rule (OURS-step-states: steps that only store answers continue on
// the device copy; writes catch up on the next save that reaches the server)
// and Submit for review.

export type BizLaneFlowKey = "bizType" | BizFlowKey;

export interface BusinessLaneProps {
  stepKey: BizLaneFlowKey;
  uid: string | null;
  biz: BusinessLaneDraft | null;
  setBiz: (f: (b: BusinessLaneDraft) => BusinessLaneDraft) => void;
  onNext: () => void;
  onBack: () => void;
  goToStep: (k: BizLaneFlowKey) => void;
  dob: string;
  setDob: (v: string) => void;
  dobLocked: boolean;
  /** After a successful Submit for review: finish the account (profile onboarded) and land on /app/business/setup. */
  onSubmitted: () => Promise<{ ok: boolean; message?: string }>;
  /** "fix": re-entered from A few things to fix (no Save and exit; Back from step 1 leaves). */
  mode?: "onboarding" | "fix";
}

export const BusinessLane: React.FC<BusinessLaneProps> = ({
  stepKey,
  uid,
  biz: bizIn,
  setBiz,
  onNext,
  onBack,
  goToStep,
  dob,
  setDob,
  dobLocked,
  onSubmitted,
  mode = "onboarding",
}) => {
  const biz = bizIn ?? emptyBusinessDraft();
  const flow = useOnboardingFlow();
  const onlineHook = useOnline();
  const online = flow ? flow.online : onlineHook;
  const [save, setSave] = useState<{ busy: boolean; error: string | null; offline: boolean }>({ busy: false, error: null, offline: false });
  const bizRef = useRef(biz);
  useEffect(() => {
    bizRef.current = biz;
  });
  // A new step starts without the last one's error; an offline note stays
  // while offline (adjusted during render when the step or connection changes).
  const [seen, setSeen] = useState({ stepKey, online });
  if (seen.stepKey !== stepKey || seen.online !== online) {
    setSeen({ stepKey, online });
    setSave((s) => (s.offline && !online ? s : { busy: false, error: null, offline: false }));
  }

  /** One step's server write; returns the draft patch it produced. */
  const writeStep = useCallback(
    async (k: BizFlowKey, d: BusinessLaneDraft): Promise<{ ok: true; patch: Partial<BusinessLaneDraft> } | { ok: false; message: string; offline?: boolean }> => {
      if (!uid) return { ok: false, message: t("You're signed out. Sign in again to save.") }; // OURS
      if (k === "bizBusiness") {
        const r = await saveBusinessBasics(uid, d);
        return r.ok ? { ok: true, patch: { businessId: r.value.id } } : r;
      }
      if (!d.businessId) return { ok: true, patch: {} };
      if (k === "bizWhere") {
        const r = await saveVenues(d, d.businessId);
        return r.ok ? { ok: true, patch: { gymId: r.value } } : r;
      }
      if (k === "bizEssentials") {
        if (d.lane === "store") {
          const r = await saveStoreSettings(d.businessId, d.essentials);
          if (!r.ok) return r;
        } else if (d.lane === "classes" && d.gymId) {
          const r = await saveClassDefaults(d.businessId, d.gymId, d.essentials);
          if (!r.ok) return r;
        }
        if (d.lane === "gym" && d.gymId) {
          // B10: minimum entry age, guest passes, front desk check-in.
          const r = await saveEntrySettings(d.gymId, d.essentials);
          if (!r.ok) return r;
        }
        if (d.lane === "classes" || d.lane === "gym") {
          // OURS-essentials-additions 4 / 5: Intro offer (classes) and Day pass (gym) plans.
          const r = await saveOfferPlans(d.businessId, d.lane, d.essentials);
          if (!r.ok) return r;
        }
        if (d.lane === "gym" && d.essentials.starterPlan) {
          const r = await saveStarterPlan(d.businessId, d.essentials.starterPlan, d.planId);
          if (!r.ok) return r;
          return { ok: true, patch: { planId: r.value } };
        }
        return { ok: true, patch: {} };
      }
      if (k === "bizPolicies") {
        const r = await savePolicyDrafts(d.businessId, d);
        return r.ok ? { ok: true, patch: {} } : r;
      }
      return { ok: true, patch: {} };
    },
    [uid]
  );

  /** Writes `k` and any step answered offline (in order), from the latest draft. */
  const flush = useCallback(
    async (k: BizFlowKey | null): Promise<{ ok: true; d: BusinessLaneDraft } | { ok: false; message: string; offline?: boolean }> => {
      let d = bizRef.current;
      const order = BIZ_STEPS.filter((s) => s === k || d.unsynced.includes(s) || (s === "bizBusiness" && !d.businessId && k !== null && BIZ_STEPS.indexOf(k) > 0));
      for (const s of order) {
        const r = await writeStep(s, d);
        if (!r.ok) return r;
        d = { ...d, ...r.patch, unsynced: d.unsynced.filter((x) => x !== s) };
      }
      return { ok: true, d };
    },
    [writeStep]
  );

  const continueFrom = useCallback(
    async (k: BizFlowKey) => {
      if (save.busy) return;
      const markUnsynced = () =>
        setBiz((b) => ({ ...b, reached: furthest(b.reached, k), unsynced: b.unsynced.includes(k) ? b.unsynced : [...b.unsynced, k] }));
      if (!online) {
        markUnsynced();
        setSave({ busy: false, error: t(OB_STRINGS.offlineStep), offline: true });
        onNext();
        return;
      }
      setSave({ busy: true, error: null, offline: false });
      const r = await flush(k);
      if (!r.ok) {
        if (r.offline) {
          markUnsynced();
          setSave({ busy: false, error: t(OB_STRINGS.offlineStep), offline: true });
          onNext();
          return;
        }
        setSave({ busy: false, error: t(r.message), offline: false });
        return;
      }
      setBiz(() => ({ ...r.d, reached: furthest(r.d.reached, k) }));
      setSave({ busy: false, error: null, offline: false });
      onNext();
    },
    [flush, onNext, online, save.busy, setBiz]
  );

  const submit = useCallback(async () => {
    if (!uid || save.busy) return;
    setSave({ busy: true, error: null, offline: false });
    const r = await flush(null);
    if (!r.ok) {
      setSave({ busy: false, error: t(r.message), offline: !!r.offline });
      return;
    }
    let d = r.d;
    if (!d.businessId) {
      const b = await writeStep("bizBusiness", d);
      if (!b.ok) {
        setSave({ busy: false, error: t(b.message), offline: !!b.offline });
        return;
      }
      d = { ...d, ...b.patch };
    }
    const sent = await submitForReview(uid, d.businessId!, d);
    if (!sent.ok) {
      setSave({ busy: false, error: t(sent.message), offline: !!sent.offline });
      return;
    }
    // The submitted files now belong to that submission: a later upload (after
    // "A few things to fix") starts a new verification id.
    d = { ...d, submittedAt: new Date().toISOString(), reached: "review", verificationId: null };
    setBiz(() => d);
    try {
      localStorage.setItem(`centium-business-lane:${uid}`, JSON.stringify(d));
    } catch {
      /* the setup page reads the server draft first */
    }
    const done = await onSubmitted();
    setSave({ busy: false, error: done.ok ? null : done.message != null ? t(done.message) : t("Couldn't finish setting up your account. Try again."), offline: false });
  }, [flush, onSubmitted, save.busy, setBiz, uid, writeStep]);

  if (stepKey === "bizType" || !biz.lane) {
    return <BusinessTypeStep biz={biz} setBiz={setBiz} onNext={onNext} onBack={onBack} />;
  }

  const props = (k: BizFlowKey): LaneStepProps => ({
    biz,
    setBiz,
    flowKey: k,
    onContinue: () => (k === "bizReview" ? void submit() : void continueFrom(k)),
    onBack,
    saveExit: k !== "bizReview" && mode !== "fix",
    save,
    uid,
    goTo: (to) => goToStep(to),
    dob,
    setDob,
    dobLocked,
    online,
  });

  switch (stepKey) {
    case "bizBusiness":
      return <YourBusinessStep {...props("bizBusiness")} />;
    case "bizWhere":
      return <WhereWhenStep {...props("bizWhere")} />;
    case "bizEssentials":
      return <EssentialsStep {...props("bizEssentials")} />;
    case "bizPolicies":
      return <PoliciesStep {...props("bizPolicies")} />;
    case "bizPayments":
      return <PaymentsStep {...props("bizPayments")} />;
    default:
      return <ReviewStep {...props("bizReview")} />;
  }
};

const ORDER = ["business", "where", "essentials", "policies", "payments", "review"] as const;
const FLOW_TO_STEP: Record<BizFlowKey, (typeof ORDER)[number]> = {
  bizBusiness: "business",
  bizWhere: "where",
  bizEssentials: "essentials",
  bizPolicies: "policies",
  bizPayments: "payments",
  bizReview: "review",
};
function furthest(reached: BusinessLaneDraft["reached"], k: BizFlowKey): BusinessLaneDraft["reached"] {
  const a = reached ? ORDER.indexOf(reached) : -1;
  const b = ORDER.indexOf(FLOW_TO_STEP[k]);
  return ORDER[Math.max(a, b)];
}
