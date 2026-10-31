import React, { useState } from "react";
import { BizFrame } from "./BizFrame";
import { BizListingPreview, BizSummary } from "./ui";
import { ObSectionLabel, ObTerms } from "../shell";
import { areaOf, bizStepNames, coverLabel, hoursSummary, initials, laneTypeLabel, listingLine, listingTags, TERMS_ERROR } from "./lanes";
import { docsFor } from "./draft";
import { useImagePreview } from "./useImagePreview";
import { HealthDisclaimer } from "../../../components/ui/HealthDisclaimer";
import type { LaneStepProps } from "./laneTypes";
import { t, tk, tn } from "../../../i18n/core";

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
  const coverUrl = useImagePreview("cover", biz.coverPath);
  const logoUrl = useImagePreview("logo", biz.logoPath);
  const uploaded = [biz.proof, biz.idFront, biz.idBack].filter((s) => s.path).length;
  // All three verification files are needed to submit (Policies and
  // verification will not continue without them; a draft from before uploads
  // opened can still arrive here without them).
  const docsMissing = uploaded < 3;
  // The picked values are English (stored); each is shown through t().
  const list = (a: string[]) => a.map((x) => t(x)).join(t(", "));
  const ess =
    lane === "classes"
      ? [list(e.classTypes) || t("No class types yet"), t("Free cancel until {hours} hours before · {spots} spots", { hours: e.cancelHours, spots: e.spots })]
      : lane === "gym"
      ? [
          list(e.amenities).toLowerCase().replace(/^./, (m) => m.toUpperCase()) || t("No facilities yet"),
          [t("QR check-in"), e.starterPlan ? `${e.starterPlan.name} $${e.starterPlan.price}` : null].filter(Boolean).join(" · "),
        ]
      : [
          list(biz.categories) || t("Nothing picked yet"),
          [
            e.pickup && e.delivery ? t("Pickup and delivery") : e.pickup ? t("Pickup") : e.delivery ? t("Delivery") : e.offersAppointments ? t("Appointments") : null,
            e.returnsRule === "returns_14" ? t("14-day returns") : e.returnsRule === "exchanges_only" ? t("Exchanges only") : t("No returns"),
          ]
            .filter(Boolean)
            .join(" · "),
        ];
  const docLine = docs
    .map((d, i) => {
      const doc = i === 0 ? t(d.title) : t(d.title).toLowerCase();
      return biz.docEdits[d.kind] ? t("{doc} edited", { doc }) : i === 0 ? t("{doc} ready", { doc }) : t("{doc} template", { doc });
    })
    .join(t(", "));
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
      title={t("Review and submit")}
      subtitle={t("One last look. You can still edit everything after you're live.")}
      onBack={onBack}
      footer={{
        label: save.busy ? t("Submitting…") : save.error && !save.offline ? t("Try again") : t("Submit for review"),
        onClick: submit,
        disabled: (termsError && !biz.termsAccepted) || !online,
        busy: save.busy,
        error: !online ? t("Connect to the internet to submit.") : save.error ?? undefined,
        errorTone: !online ? "info" : "error",
        note: <HealthDisclaimer className="mx-auto max-w-[310px] mb-3" />,
      }}
    >
      <BizSummary n={1} title={t(names.business)} lines={[`${biz.name} · ${typeL}`, biz.phone]} onAction={() => goTo("bizBusiness")} />
      <BizSummary
        n={2}
        title={t(names.where)}
        lines={[biz.location.address, hoursSummary(biz.hours)].concat(biz.extraLocations.filter((l) => l.address).map((l) => l.address))}
        onAction={() => goTo("bizWhere")}
      />
      <BizSummary n={3} title={t(names.essentials)} lines={ess} onAction={() => goTo("bizEssentials")} />
      <BizSummary
        n={4}
        title={t(names.policies)}
        lines={[
          docLine.replace(/^./, (m) => m.toUpperCase()),
          // Never 1 here (all three are needed to get this far), so one English form.
          docsMissing ? t("Verification documents missing") /* OURS */ : tn(uploaded, "{n} documents uploaded", "{n} documents uploaded"),
        ]}
        bad={docsMissing}
        onAction={() => goTo("bizPolicies")}
      />
      <BizSummary n={5} title={t(names.payments)} lines={[biz.cash ? t("Cash now, Whish after approval") : t("Whish after approval")]} onAction={() => goTo("bizPayments")} />
      <ObSectionLabel title={t("Your listing on Explore")} margin="14px 2px 12px" />
      <BizListingPreview
        coverUrl={coverUrl}
        coverLabel={coverLabel(lane)}
        logoUrl={logoUrl}
        initials={initials(biz.name)}
        name={biz.name}
        type={area ? `${typeL} · ${area}` : typeL}
        tags={listingTags(lane === "classes" && e.classTypes.length ? e.classTypes : biz.categories)}
        line={listingLine(lane, biz.hours, e, area)}
      />
      <ObTerms
        doc={tk("Business Terms")}
        on={biz.termsAccepted}
        onChange={(v) => {
          setBiz((b) => ({ ...b, termsAccepted: v }));
          if (v) setTermsError(false);
        }}
        error={termsError && !biz.termsAccepted ? t(TERMS_ERROR) : undefined}
        disabled={save.busy}
      />
    </BizFrame>
  );
};
