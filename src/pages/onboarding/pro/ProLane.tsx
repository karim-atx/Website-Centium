import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../../context/AppContext";
import { updateProfileFromOnboarding } from "../../../services/profile";
import { recordLegalAcceptances } from "../../../services/legal/acceptances";
import { setMapArea, setPublicListing } from "../../../services/professional-profile";
import { fetchMyCv } from "../../../services/professional-cv";
import { logOtherDiscipline, markOwnerItemDone, professionalLaneSchema, saveProLaneColumns } from "../../../services/professional-onboarding";
import { OFFLINE_MESSAGE } from "../../../services/network-error";
import { ageFromDateOfBirth } from "../../../utils/date";
import type { ActivityLevel, Goal, ProfessionalSubtype, TrackPreference } from "../../../types";
import {
  CLOSEST_GROUP_LEGACY,
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
 * that need a date of birth on file: the map area and, for Fitness / Other,
 * the public listing (Go live). A Physiotherapist / Dietitian is listed when
 * the licence is verified (GO_LIVE_ON_VERIFICATION, read by the dashboard).
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
  const [done, setDone] = useState<{ status: ProStatus; at: Date; notListed: string | null; headline: string | null } | null>(null);

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
    const legal = await recordLegalAcceptances(authUserId, ["terms", "privacy", "health_disclaimer"]);
    if (!legal.ok) return { ok: false, message: legal.offline ? OFFLINE_MESSAGE : fail };

    const other = kind === "other";
    const v2 = (await professionalLaneSchema()) === "v2";
    // A radius only where home visits can happen (not online only, not at a business).
    const homeVisitKm = pro.workMode !== "online" && pro.workMode !== "business" ? pro.homeVisitKm : null;
    const cols = await saveProLaneColumns(authUserId, {
      other_discipline: other && pro.whatYouDo.trim().length >= 2 ? pro.whatYouDo.trim().slice(0, 40) : null,
      closest_group: other && pro.closestGroup ? (v2 ? pro.closestGroup : CLOSEST_GROUP_LEGACY[pro.closestGroup]) : null,
      work_mode: pro.workMode ? WORK_MODE_TO_DB[pro.workMode] : null,
      home_visit_km: homeVisitKm,
      specialties: pro.specialties,
      session_formats: formatsForDb(pro.formats),
      session_lengths: lengthsForDb(pro.lengths),
      ...(v2 ? { session_places: placesForDb(pro.formats, homeVisitKm) } : null),
    });
    if (!cols.ok) return cols;
    if (other && pro.whatYouDo.trim()) void logOtherDiscipline(authUserId, pro.whatYouDo);

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
    let notListed: string | null = null;
    if (isRegulated(kind)) {
      await markOwnerItemDone(authUserId, GO_LIVE_ON_VERIFICATION).then(() => undefined);
    } else {
      const listed = await setPublicListing(true);
      if (listed.status === "error") notListed = listed.message;
      else if (listed.status === "affiliated") notListed = "Your listing is handled by your business while you're affiliated.";
    }
    const cv = await fetchMyCv(authUserId);
    onFinished();
    setDone({
      status: isRegulated(kind) ? "pending" : "live",
      at: new Date(),
      notListed,
      headline: cv.ok ? cv.cv.profile.headline : null,
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
        preview={{
          initials: initials(name),
          avatarUrl: user.avatarUrl ?? null,
          name,
          label,
          tags: pro.specialties,
          line: done.headline,
        }}
        onPrimary={() => navigate("/app/professionals")}
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
