import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useApp } from "../../../context/AppContext";
import { ObToast, useObToast, OB_STRINGS } from "../shell";
import { ApprovedScreen, PendingScreen, RejectedScreen, StatusLoading } from "./StatusScreens";
import { BusinessLane, type BizLaneFlowKey } from "./BusinessLane";
import { BIZ_STEPS, type BizFlowKey } from "./bizLanes";
import { emptyBusinessDraft, normaliseBusinessDraft, type BusinessLaneDraft } from "./draft";
import { areaOf, coverLabel, initials, laneForBusinessType, laneTypeLabel, listingLine, listingTags, type StoreType } from "./lanes";
import { itemStep } from "./reviewItems";
import {
  fetchMyBusinessRow,
  fetchReviewStatus,
  hasProgress,
  markProgress,

  type ReviewStatus,
} from "../../../services/business-onboarding";
import { listDrafts } from "../../../services/onboarding/drafts";
import { saveListingActive } from "../../../services/business-market";
import { useImagePreview } from "./useImagePreview";
import "../shell/onboarding.css";

// /app/business/setup: where a business lands after Submit for review, and
// what it sees until it is live: OB-238 Pending review; OB-240 You're live,
// with the approval celebration (OB-307…314) the first time only
// (onboarding_progress "approval_seen"); OB-242 A few things to fix, whose
// "Fix and resubmit" re-enters the lane at the step to fix and submits again.

const LOCAL_KEY = (uid: string) => `centium-business-lane:${uid}`;

function readLocal(uid: string): BusinessLaneDraft | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY(uid));
    return raw ? normaliseBusinessDraft(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
function writeLocal(uid: string, d: BusinessLaneDraft) {
  try {
    localStorage.setItem(LOCAL_KEY(uid), JSON.stringify(d));
  } catch {
    /* the device copy is a convenience */
  }
}

const actionFor = (field: string) => (/photo|cover|logo/i.test(field) ? "Replace" : /\bid\b/i.test(field) ? "Retake" : "Edit");

export default function BusinessSetupPage() {
  const { authUserId, user } = useApp();
  const navigate = useNavigate();
  const uid = authUserId;
  const [status, setStatus] = useState<ReviewStatus | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [biz, setBizState] = useState<BusinessLaneDraft>(() => (uid ? readLocal(uid) : null) ?? emptyBusinessDraft());
  const [fix, setFix] = useState<BizFlowKey | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [toast, showToast] = useObToast();
  const loaded = useRef(false);

  const setBiz = useCallback(
    (f: (b: BusinessLaneDraft) => BusinessLaneDraft) =>
      setBizState((b) => {
        const next = f(b);
        if (uid) writeLocal(uid, next);
        return next;
      }),
    [uid]
  );

  const load = useCallback(async () => {
    if (!uid) return;
    setError(null);
    const [st, drafts, row] = await Promise.all([fetchReviewStatus(uid), listDrafts(uid), fetchMyBusinessRow(uid)]);
    if (!st.ok) {
      setError(OB_STRINGS.statusLoadError);
      setStatus(undefined);
      return;
    }
    // The flow keeps the lane's answers under draft.biz (onboarding_drafts payload { v, draft }).
    const bizDraft = drafts.ok ? drafts.value.find((d) => d.lane === "business") : undefined;
    const payload = bizDraft ? (bizDraft.payload as { draft?: { biz?: unknown } }) : null;
    if (payload?.draft?.biz) setBizState(normaliseBusinessDraft(payload.draft.biz));
    else if (row.ok && row.value) {
      const t = row.value.businessType;
      const lane = laneForBusinessType(t);
      setBizState((b) => ({ ...b, businessId: row.value!.id, lane: b.lane ?? lane, storeType: b.storeType ?? (lane === "store" ? (t as StoreType) : null) }));
    }
    // The draft's verification id is the submission it was sent as: files
    // added while fixing belong to the next one, so they start a new id (and
    // never replace a file the submitted record points at).
    const submittedId = st.value?.verificationId;
    if (submittedId) setBizState((b) => (b.verificationId === submittedId ? { ...b, verificationId: null } : b));
    if (st.value?.status === "approved" && row.ok && row.value) {
      const seen = await hasProgress(row.value.id, "approval_seen");
      if (!seen) {
        setCelebrate(true);
        void markProgress(row.value.id, "approval_seen");
      }
    }
    setStatus(st.value);
  }, [uid]);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    void load();
  }, [load]);

  const lane = biz.lane ?? laneForBusinessType(status?.businessType) ?? "gym";
  const name = status?.businessName ?? biz.name;
  // The owner's own pictures, a staged one (waiting for approval) included.
  const coverUrl = useImagePreview("cover", biz.coverPath);
  const logoUrl = useImagePreview("logo", biz.logoPath);
  const preview = useMemo(
    () => ({
      coverUrl,
      coverLabel: coverLabel(lane),
      logoUrl,
      initials: initials(name),
      name,
      type: areaOf(biz.location.address) ? `${laneTypeLabel(lane, biz.storeType)} · ${areaOf(biz.location.address)}` : laneTypeLabel(lane, biz.storeType),
      tags: listingTags(lane === "classes" && biz.essentials.classTypes.length ? biz.essentials.classTypes : biz.categories),
      line: listingLine(lane, biz.hours, biz.essentials, areaOf(biz.location.address)),
    }),
    [biz, lane, name, coverUrl, logoUrl]
  );

  if (!uid) return <Navigate to="/app/onboarding" replace />;
  if (user.accountType !== "business") return <Navigate to="/app" replace />;

  if (fix) {
    const at = BIZ_STEPS.indexOf(fix);
    return (
      <BusinessLane
        stepKey={fix}
        uid={uid}
        biz={biz}
        setBiz={setBiz}
        onNext={() => {
          setFix(BIZ_STEPS[Math.min(at + 1, BIZ_STEPS.length - 1)]);
          window.scrollTo(0, 0);
        }}
        onBack={() => {
          setFix(at > 0 ? BIZ_STEPS[at - 1] : null);
          window.scrollTo(0, 0);
        }}
        goToStep={(k: BizLaneFlowKey) => k !== "bizType" && setFix(k)}
        dob={user.dateOfBirth ?? ""}
        setDob={() => undefined}
        dobLocked
        mode="fix"
        onSubmitted={async () => {
          setFix(null);
          setStatus(undefined);
          await load();
          return { ok: true };
        }}
      />
    );
  }

  if (status === undefined) {
    return (
      <StatusLoading
        footer={{ label: error ? "Try again" : "Go to Dashboard", onClick: () => (error ? void load() : navigate("/app")), error: error ?? undefined, disabled: !error }}
      />
    );
  }
  if (!status || status.status === "none") return <Navigate to="/app" replace />;

  if (status.status === "pending") {
    return <PendingScreen name={name} submittedAt={status.submittedAt} footer={{ label: "Go to Dashboard", onClick: () => navigate("/app") }} />;
  }

  if (status.status === "approved") {
    const share = async () => {
      const text = `Find ${name} on Centium Explore.`; // OURS (the public listing URL shape is UNSPECIFIED)
      try {
        if (navigator.share) await navigator.share({ title: name, text });
        else {
          await navigator.clipboard.writeText(text);
          showToast("Copied."); // OURS
        }
      } catch {
        /* the share sheet was closed */
      }
    };
    return (
      <>
        <ApprovedScreen
          lane={lane}
          name={name}
          preview={preview}
          animate={celebrate}
          onOpenDashboard={() => navigate("/app")}
          onShare={() => void share()}
          listed={status.active}
          onShowOnExplore={async () => {
            const r = await saveListingActive(status.businessId, true);
            if (!r.ok) return r.message ?? "Couldn't turn your listing on. Try again.";
            setStatus({ ...status, active: true });
            showToast("Your listing is on Explore.");
            return null;
          }}
        />
        <ObToast message={toast} bottom={142} />
      </>
    );
  }

  const items = status.items.map((it) => {
    const step = itemStep(it, lane);
    return { ...it, n: BIZ_STEPS.indexOf(step) + 1, action: actionFor(it.field), onAction: () => setFix(step) };
  });
  return (
    <RejectedScreen
      items={items}
      footer={{
        label: "Fix and resubmit",
        onClick: () => setFix(items[0] ? itemStep(items[0], lane) : "bizBusiness"),
      }}
    />
  );
}
