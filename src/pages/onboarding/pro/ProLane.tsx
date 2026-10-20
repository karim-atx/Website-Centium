import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../../context/AppContext";
import { updateProfileFromOnboarding } from "../../../services/profile";
import { recordLegalAcceptances } from "../../../services/legal/acceptances";
import { fetchMyProfile, setMapArea, UNDER_18_LISTING } from "../../../services/professional-profile";
import { fetchMyCv } from "../../../services/professional-cv";
import { requestToJoin } from "../../../services/business-team/employment";
import { fetchGoLiveStatus, logOtherDiscipline, markOwnerItemDone, saveProLaneColumns } from "../../../services/professional-onboarding";
import { OFFLINE_MESSAGE } from "../../../services/network-error";
import { ageFromDateOfBirth } from "../../../utils/date";
import type { ActivityLevel, Goal, ProfessionalSubtype, TrackPreference } from "../../../types";
import {
  placesForDb,
  WORK_MODE_TO_DB,
  emptyProDraft,
  formatsForDb,
  initials,
  isRegulated,
  lengthsForDb,
  proKindOf,
  PRO_LABEL,
  restoreProDraft,
  GO_LIVE_ON_VERIFICATION,
  type ProFlowStep,
  type ProLaneDraft,
  type ProStepKey,
} from "./proModel";
import { ProSpecialtyStep } from "./ProSpecialtyStep";
import { ProAboutStep } from "./ProAboutStep";
import { ProWorkStep } from "./ProWorkStep";
import { ProServicesStep } from "./ProServicesStep";
import { ProCredentialsStep } from "./ProCredentialsStep";
import { ProBackgroundStep } from "./ProBackgroundStep";
import { ProReviewStep } from "./ProReviewStep";
import { ProStatusScreen, type ProStatus } from "./ProStatusScreen";
import type { ProShared, ProStepProps } from "./types";

const FLOW_OF: Record<ProStepKey, ProFlowStep> = {
  about: "proAbout",
  work: "proWork",
  services: "proServices",
  creds: "proCreds",
  background: "background",
  review: "proReview",
};


interface DraftLike extends ProShared {
  email: string;
  pro: ProLaneDraft | null;
}

/**
 * The professional lane (OB-136 to OB-215): renders the step the flow is on,
 * keeps the lane's answers in `draft.pro` (persisted by the shell with the rest
 * of the draft: device copy and onboarding_drafts), and submits at Review.
 *
 * SUBMIT ORDER: the Terms acceptance first (nothing is set up without it on
 * record), then the lane's columns, then the profile row (which marks the
 * account onboarded, server first as task T requires), then the two things
 * that need a date of birth on file: the map area, and the go-live item. No
 * lane is listed at submit: every professional is listed once their licence
 * or certificate is verified (GO_LIVE_ON_VERIFICATION, read by the dashboard;
 * user decision 14 Oct 2026).
 */
export function ProLane<D extends DraftLike>({
  stepKey,
  draft,
  setDraft,
  onNext,
  onBack,
  goToStep,
  onFinished,
}: {
  stepKey: ProFlowStep;
  draft: D;
  setDraft: React.Dispatch<React.SetStateAction<D>>;
  onNext: () => void;
  onBack: () => void;
  goToStep: (key: ProFlowStep) => void;
  /** Clears the device and server drafts once the account is set up. */
  onFinished: () => void;
}) {
  const { authUserId, completeOnboarding, user } = useApp();
  const navigate = useNavigate();
  const kind = proKindOf(draft.professionalSubtype);
  const pro = restoreProDraft(kind, draft.pro);
  const [returnToReview, setReturnToReview] = useState(false);
  const [done, setDone] = useState<{ status: ProStatus; at: Date; notListed: string | null; headline: string | null; noDocument: boolean } | null>(null);

  const setPro: React.Dispatch<React.SetStateAction<ProLaneDraft>> = useCallback(
    (u) =>
      setDraft((d) => {
        const cur = d.pro ?? emptyProDraft(proKindOf(d.professionalSubtype));
        return { ...d, pro: typeof u === "function" ? (u as (p: ProLaneDraft) => ProLaneDraft)(cur) : u };
      }),
    [setDraft]
  );
  const setShared = useCallback((patch: Partial<ProShared>) => setDraft((d) => ({ ...d, ...patch })), [setDraft]);

  const next = () => {
    if (returnToReview) {
      setReturnToReview(false);
      goToStep("proReview");
    } else onNext();
  };
  const goTo = (s: ProStepKey) => {
    setReturnToReview(true);
    goToStep(FLOW_OF[s]);
  };

  const submit = async (): Promise<{ ok: true } | { ok: false; message: string }> => {
    if (!authUserId) return { ok: false, message: "You're signed out. Go back and sign in again to finish." };
    const fail = "Couldn't finish setting up your account. Try again.";
    // Terms and Privacy from the Review checkbox; the health disclaimer is
    // shown above the Review step's submit button (ProReviewStep).
    const legal = await recordLegalAcceptances(authUserId, ["terms", "privacy", "health_disclaimer"]);
    if (!legal.ok) return { ok: false, message: legal.offline ? OFFLINE_MESSAGE : fail };

    const other = kind === "other";
    // A radius only where home visits can happen (not online only, not at a business).
    const homeVisitKm = pro.workMode !== "online" && pro.workMode !== "business" ? pro.homeVisitKm : null;
    const cols = await saveProLaneColumns(authUserId, {
      other_discipline: other && pro.whatYouDo.trim().length >= 2 ? pro.whatYouDo.trim().slice(0, 40) : null,
      closest_group: other && pro.closestGroup ? pro.closestGroup : null,
      work_mode: pro.workMode ? WORK_MODE_TO_DB[pro.workMode] : null,
      home_visit_km: homeVisitKm,
      specialties: pro.specialties,
      session_formats: formatsForDb(pro.formats),
      session_lengths: lengthsForDb(pro.lengths),
      session_places: placesForDb(pro.formats, homeVisitKm),
    });
    if (!cols.ok) return cols;
    if (other && pro.whatYouDo.trim()) void logOtherDiscipline(authUserId, pro.whatYouDo);

    // "At a business": the join request (Database B6 request_to_join_business).
    // The business approves it and they still accept the employment. Sent
    // before the profile is finished so a wrong ID can be fixed on Review;
    // asking twice returns the same request.
    const code = pro.workMode === "business" ? pro.businessCode.trim() : "";
    if (code) {
      const joined = await requestToJoin(code);
      if (!joined.ok) {
        const notFound = joined.message === "No business found for that ID.";
        return { ok: false, message: notFound ? "No business found for that ID. Check it in Where you work." : joined.message };
      }
    }

    const subtype: ProfessionalSubtype = draft.professionalSubtype ?? "other";
    const resolved = {
      email: draft.email,
      accountType: "professional" as const,
      professionalSubtype: subtype,
      firstName: draft.firstName || "Friend",
      dateOfBirth: draft.dateOfBirth,
      age: ageFromDateOfBirth(draft.dateOfBirth) ?? 28,
      // Not asked of a professional (V4): the defaults the live finish() sent.
      sex: "female" as const,
      heightCm: 170,
      weightKg: 70,
      goals: ["improve_health"] as Goal[],
      activityLevel: "moderate" as ActivityLevel,
      tracking: ["nutrition", "workouts"] as TrackPreference[],
    };
    const saved = await updateProfileFromOnboarding(authUserId, resolved);
    if (!saved.ok) return { ok: false, message: saved.message ?? fail };
    completeOnboarding({ ...resolved, certificationUrl: draft.certificationFile ?? undefined });

    // Needs the date of birth just saved. Only shown to clients once listed.
    if (pro.area && pro.workMode && pro.workMode !== "online") {
      const r = await setMapArea(pro.area.lat, pro.area.lng, pro.area.label);
      if (!r.ok) console.warn("[pro-onboarding] Area not saved:", r.message);
    }
    // Nobody is listed at submit (user decision, 14 Oct 2026, every lane): the
    // listing waits for the licence or certificate check (GO_LIVE_ON_VERIFICATION,
    // acted on by the dashboard and the verification screen). Under 18 (ATX47)
    // and affiliated (ATX03) accounts are never listed individually.
    const age = ageFromDateOfBirth(draft.dateOfBirth);
    const mine = await fetchMyProfile(authUserId);
    let notListed: string | null = null;
    if (age != null && age < 18) notListed = UNDER_18_LISTING;
    else if (mine.ok && mine.profile?.affiliatedBusinessId) notListed = "Your listing is handled by your business while you're affiliated.";
    else await markOwnerItemDone(authUserId, GO_LIVE_ON_VERIFICATION).then(() => undefined);
    const [cv, goLive] = await Promise.all([fetchMyCv(authUserId), fetchGoLiveStatus(authUserId, isRegulated(kind))]);
    onFinished();
    setDone({
      status: notListed ? "live" : "pending",
      at: new Date(),
      notListed,
      headline: cv.ok ? cv.cv.profile.headline : null,
      noDocument: goLive.ok && goLive.status.kind === "none",
    });
    return { ok: true };
  };

  const props: ProStepProps = {
    kind,
    shared: draft,
    setShared,
    pro,
    setPro,
    userId: authUserId,
    onNext: next,
    onBack,
    goTo,
  };

  if (done) {
    const name = draft.firstName.trim();
    const label = kind === "other" && pro.whatYouDo.trim() ? pro.whatYouDo.trim() : PRO_LABEL[kind];
    return (
      <ProStatusScreen
        status={done.status}
        kind={kind}
        firstName={name}
        submittedAt={done.at}
        notListed={done.notListed}
        noDocument={done.noDocument}
        preview={{
          initials: initials(name),
          avatarUrl: user.avatarUrl ?? null,
          name,
          label,
          tags: pro.specialties,
          line: done.headline,
        }}
        onPrimary={() => navigate("/app/pro")}
      />
    );
  }

  switch (stepKey) {
    case "subtype":
      return (
        <ProSpecialtyStep
          value={draft.professionalSubtype}
          onChange={(v) =>
            setDraft((d) => {
              if (d.professionalSubtype === v) return d;
              // A different specialty: its own chips and session boxes, and the
              // regulated / unregulated credentials, start again.
              const k = proKindOf(v);
              const prev = d.pro ? restoreProDraft(k, d.pro) : emptyProDraft(k);
              const fresh = emptyProDraft(k);
              return {
                ...d,
                professionalSubtype: v,
                pro: {
                  ...prev,
                  specialties: [],
                  formats: [],
                  lengths: fresh.lengths,
                  homeVisitKm: k === "physio" ? prev.homeVisitKm : null,
                  whatYouDo: k === "other" ? prev.whatYouDo : "",
                  closestGroup: k === "other" ? prev.closestGroup : null,
                },
              };
            })
          }
          onNext={onNext}
          onBack={onBack}
        />
      );
    case "proAbout":
      return <ProAboutStep {...props} />;
    case "proWork":
      return <ProWorkStep {...props} />;
    case "proServices":
      return <ProServicesStep {...props} />;
    case "proCreds":
      return <ProCredentialsStep {...props} />;
    case "background":
      return <ProBackgroundStep {...props} />;
    case "proReview":
      return <ProReviewStep {...props} onSubmit={submit} />;
  }
}
