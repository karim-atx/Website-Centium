import React, { useState } from "react";
import { BizFrame } from "./BizFrame";
import { BizListingPreview, BizSummary } from "./ui";
import { ObSectionLabel, ObTerms } from "../shell";
import { areaOf, bizStepNames, coverLabel, hoursSummary, initials, laneTypeLabel, listingLine, listingTags, TERMS_ERROR } from "./lanes";
import { docsFor } from "./draft";
import { imageUrl } from "../../../services/business-onboarding";
import { HealthDisclaimer } from "../../../components/ui/HealthDisclaimer";
import type { LaneStepProps } from "./laneTypes";

// OB-234 / 268 / 296 (+ 236 / 270 / 298 listing preview, 237 terms not
// accepted): Step 6 · Review and submit. KEEP-SAFETY: the health disclaimer
// sits above Submit for review, so the acceptance recorded on submit
// (submitForReview) is for text the person has seen.

export const ReviewStep: React.FC<LaneStepProps> = ({ biz, setBiz, flowKey, onContinue, onBack, save, goTo, online }) => {
  const lane = biz.lane ?? "gym";
  const names = bizStepNames(lane);
  const e = biz.essentials;
  const [termsError, setTermsError] = useState(false);
  const typeL = laneTypeLabel(lane, biz.storeType);
  const docs = docsFor(biz);
  const uploaded = [biz.proof, biz.idFront, biz.idBack].filter((s) => s.path).length;
  // All three verification files are needed to submit (Policies and
  // verification will not continue without them; a draft from before uploads
  // opened can still arrive here without them).
  const docsMissing = uploaded < 3;
  const ess =
    lane === "classes"
      ? [e.classTypes.join(", ") || "No class types yet", `Free cancel until ${e.cancelHours} hours before · ${e.spots} spots`]
      : lane === "gym"
      ? [
          e.amenities.join(", ").toLowerCase().replace(/^./, (m) => m.toUpperCase()) || "No facilities yet",
          [e.qrCheckIn ? "QR check-in" : "Front desk check-in", e.starterPlan ? `${e.starterPlan.name} $${e.starterPlan.price}` : null].filter(Boolean).join(" · "),
        ]
      : [
          biz.categories.join(", ") || "Nothing picked yet",
          [
            e.pickup && e.delivery ? "Pickup and delivery" : e.pickup ? "Pickup" : e.delivery ? "Delivery" : e.offersAppointments ? "Appointments" : null,
            e.returnsRule === "returns_14" ? "14-day returns" : e.returnsRule === "exchanges_only" ? "Exchanges only" : "No returns",
          ]
            .filter(Boolean)
            .join(" · "),
        ];
  const docLine = docs
    .map((d, i) => `${i === 0 ? d.title : d.title.toLowerCase()} ${biz.docEdits[d.kind] ? "edited" : i === 0 ? "ready" : "template"}`)
    .join(", ");
  const area = areaOf(biz.location.address);

  const submit = () => {
    if (docsMissing) {
      goTo("bizPolicies");
      return;
    }
    if (!biz.termsAccepted) {
      setTermsError(true);
      return;
    }
    onContinue();
  };

  return (
    <BizFrame
      step={flowKey}
      lane={lane}
      saveExit={false}
      title="Review and submit"
      subtitle="One last look. You can still edit everything after you're live."
      onBack={onBack}
      footer={{
        label: save.busy ? "Submitting…" : save.error && !save.offline ? "Try again" : "Submit for review",
        onClick: submit,
        disabled: (termsError && !biz.termsAccepted) || !online,
        busy: save.busy,
        error: !online ? "Connect to the internet to submit." : save.error ?? undefined,
        errorTone: !online ? "info" : "error",
        note: <HealthDisclaimer className="mx-auto max-w-[310px] mb-3" />,
      }}
    >
      <BizSummary n={1} title={names.business} lines={[`${biz.name} · ${typeL}`, biz.phone]} onAction={() => goTo("bizBusiness")} />
      <BizSummary
        n={2}
        title={names.where}
        lines={[biz.location.address, hoursSummary(biz.hours)].concat(biz.extraLocations.filter((l) => l.address).map((l) => l.address))}
        onAction={() => goTo("bizWhere")}
      />
      <BizSummary n={3} title={names.essentials} lines={ess} onAction={() => goTo("bizEssentials")} />
      <BizSummary
        n={4}
        title={names.policies}
        lines={[docLine.replace(/^./, (m) => m.toUpperCase()), docsMissing ? "Verification documents missing" /* OURS */ : `${uploaded} documents uploaded`]}
        bad={docsMissing}
        onAction={() => goTo("bizPolicies")}
      />
      <BizSummary n={5} title={names.payments} lines={[biz.cash ? "Cash now, Whish after approval" : "Whish after approval"]} onAction={() => goTo("bizPayments")} />
      <ObSectionLabel title="Your listing on Explore" margin="14px 2px 12px" />
      <BizListingPreview
        coverUrl={imageUrl("cover", biz.coverPath)}
        coverLabel={coverLabel(lane)}
        logoUrl={imageUrl("logo", biz.logoPath)}
        initials={initials(biz.name)}
        name={biz.name}
        type={area ? `${typeL} · ${area}` : typeL}
        tags={listingTags(lane === "classes" && e.classTypes.length ? e.classTypes : biz.categories)}
        line={listingLine(lane, biz.hours, e, area)}
      />
      <ObTerms
        doc="Business Terms"
        on={biz.termsAccepted}
        onChange={(v) => {
          setBiz((b) => ({ ...b, termsAccepted: v }));
          if (v) setTermsError(false);
        }}
        error={termsError && !biz.termsAccepted ? TERMS_ERROR : undefined}
        disabled={save.busy}
      />
    </BizFrame>
  );
};
