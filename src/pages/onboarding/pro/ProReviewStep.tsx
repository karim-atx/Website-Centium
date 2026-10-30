import React, { useState } from "react";
import { ObStep, ObFooter } from "../shell/ObShell";
import { ObSectionLabel, ObTerms } from "../shell/ObBlocks";
import { useOnboardingFlow, OB_STRINGS } from "../shell/flow";
import { HealthDisclaimer } from "../../../components/ui/HealthDisclaimer";
import { useApp } from "../../../context/AppContext";
import { useMyCv } from "../../../components/cv/useMyCv";
import { FORMATS, PRO_LABEL, isRegulated, initials, optionLabel, workSummary } from "./proModel";
import { proLaneId } from "./proLanes";
import { proChipLabel } from "./proModel";
import { ProfilePreview, SummaryCard } from "./parts";
import { ProLicencePublish } from "./ProLicencePublish";
import { useCoverPicker } from "../../../components/pro/profile/useCoverPicker";
import { ImageApprovalBadge, ImageApprovalNote } from "../../../components/moderation/ImageApproval";
import { ensureProProfileRow } from "../../../services/professional-onboarding";
import type { ProStepProps } from "./types";
import { t, tk, tn, tx } from "../../../i18n/core";

/** What the Background summary lists, from the stored CV (translated: called during render). */
function backgroundLine(cv: ReturnType<typeof useMyCv>["cv"]): string {
  if (!cv) return t("Loading…");
  const parts: string[] = [];
  if (cv.profile.headline) parts.push(t("Headline"));
  const lic = cv.licences.filter((l) => l.name || l.documentPath).length;
  if (lic) parts.push(tn(lic, "{n} licence", "{n} licences"));
  if (cv.experience.length) parts.push(tn(cv.experience.length, "{n} role", "{n} roles"));
  if (cv.education.length) parts.push(t("education"));
  if (cv.profile.skills.length) parts.push(t("skills"));
  if (cv.languages.length) parts.push(t("languages"));
  if (!parts.length) return t("Nothing added yet, optional");
  const s = parts.join(t(", "));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Step 6 · Review and submit (OB-152, OB-154, OB-180, OB-182, OB-183, OB-209,
 * OB-211). Every summary is the person's own answers (the frames' sample
 * values never ship); Edit opens that step and its Continue comes back here.
 * The Terms checkbox is required and recorded (B5 legal_acceptances).
 * Every lane goes live only once checked (user decision 14 Oct 2026):
 * "Submit for verification" (the licence or certificate check runs in the
 * existing review queue); Fitness / Other without a certificate "Finish
 * setting up" (nothing to check yet, so not listed until one is added).
 * KEEP-SAFETY: the health disclaimer sits above the submit button, so the
 * health_disclaimer acceptance recorded on submit (ProLane) is for text the
 * person has seen (same placement as the client's You're all set).
 */
export const ProReviewStep: React.FC<
  ProStepProps & { onSubmit: () => Promise<{ ok: true } | { ok: false; message: string }> }
> = ({ kind, shared, pro, setPro, onBack, goTo, onSubmit }) => {
  const flow = useOnboardingFlow();
  const { user, authUserId } = useApp();
  const { cv, setCv } = useMyCv();
  // Release B (W6C-3): the cover on the preview. submit_image needs the
  // professional_profiles row, which ensureProProfileRow makes (as the
  // credential step does before a licence upload).
  const cover = useCoverPicker(async () => (authUserId ? ensureProProfileRow(authUserId) : { ok: false }));
  const [termsError, setTermsError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const reg = isRegulated(kind);
  const chipLabel = proChipLabel(kind, pro.whatYouDo);
  const offline = !!flow && !flow.online;

  const label = kind === "other" && pro.whatYouDo.trim() ? pro.whatYouDo.trim() : t(PRO_LABEL[kind]);
  const formats = pro.formats.filter((f) => FORMATS[kind].includes(f));
  const servicesLines = [
    pro.specialties.length ? pro.specialties.map((s) => t(s)).join(t(", ")) : t("No specialties yet"),
    formats.length ? formats.map(optionLabel).join(t(", ")) : t("No session formats yet"),
  ];
  const number = pro.licenceNumber.trim();
  const credLine = reg
    ? kind === "physio" || kind === "doctor"
      ? pro.registrationLicenceId
        ? t("Licence {number} · proof uploaded", { number })
        : t("Licence {number}", { number })
      : pro.registrationLicenceId
      ? t("Registration {number} · proof uploaded", { number })
      : t("Registration {number}", { number })
    : shared.certificationFile
    ? t("Certificate uploaded, checked before you go live")
    : t("No certificate yet, needed to go live");
  const toCheck = reg || !!shared.certificationFile;

  const submit = async () => {
    if (!pro.termsAccepted) {
      setTermsError(tk("Accept the Terms of Service and Privacy Policy to submit."));
      return;
    }
    if (busy || offline) return;
    setBusy(true);
    setSubmitError(null);
    const r = await onSubmit();
    setBusy(false);
    if (!r.ok) setSubmitError(r.message);
  };

  const name = shared.firstName.trim() || t("Your name");

  return (
    <ObStep
      lane={proLaneId(kind)}
      chipLabel={chipLabel}
      step="review"
      title={t("Review and submit")}
      subtitle={
        reg
          ? t("One last look. Your profile goes live once your licence is checked.")
          : toCheck
          ? t("One last look. Your profile goes live once your certificate is checked.")
          : t("One last look. Your profile goes live once you add a certificate and we've checked it.")
      }
      onBack={onBack}
      saveExit={false}
      footer={
        <ObFooter
          error={submitError ? t(submitError) : offline ? t(OB_STRINGS.offlineSubmit) : null}
          errorTone={submitError ? "error" : "info"}
          primary={{
            label: busy ? t(OB_STRINGS.submitting) : submitError ? t(OB_STRINGS.tryAgain) : toCheck ? t("Submit for verification") : t("Finish setting up"),
            onClick: () => void submit(),
            disabled: busy || offline || !!termsError,
          }}
        >
          <HealthDisclaimer className="mx-auto max-w-[310px] mb-3" />
        </ObFooter>
      }
    >
      <SummaryCard n={1} heading={t("About you")} lines={[`${name} · ${label}`]} onAction={() => goTo("about")} />
      <SummaryCard n={2} heading={t("Where you work")} lines={[workSummary(pro, kind)]} onAction={() => goTo("work")} />
      <SummaryCard n={3} heading={t("Specialties and services")} lines={servicesLines} onAction={() => goTo("services")} />
      <SummaryCard n={4} heading={t("Credentials")} lines={[credLine]} onAction={() => goTo("creds")} />
      <SummaryCard n={5} heading={t("Your background")} lines={[backgroundLine(cv)]} onAction={() => goTo("background")} />
      <ObSectionLabel title={t("Your public profile")} margin="14px 2px 12px" />
      <ProfilePreview
        initials={initials(name)}
        avatarUrl={user.avatarUrl ?? null}
        name={name}
        type={`${label} · ${pro.workMode === "online" ? tx("Online", "session format") : pro.area?.label ?? t("Area not set")}`}
        tags={pro.specialties.slice(0, 3).map((s) => t(s))}
        line={cv?.profile.headline ?? null}
        coverUrl={cover.url}
        onCover={cover.choose}
        coverBusy={cover.busy}
        coverBadge={cover.image && <ImageApprovalBadge state={cover.image} />}
      />
      {cover.inputs}
      {cover.error && (
        <p role="alert" className="obp-sum-flag" style={{ margin: "-6px 2px 10px" }}>
          {t(cover.error)}
        </p>
      )}
      {/* Round C Release 2: a new cover waits for approval. */}
      <ImageApprovalNote state={cover.image} className="mx-0.5 mb-2.5" />
      {/* OURS-licence-publish: the licences that will be on that profile, by choice, before going live. */}
      {cv && (
        <ProLicencePublish
          licences={cv.licences}
          onChanged={(l) => setCv((c) => (c ? { ...c, licences: c.licences.map((x) => (x.id === l.id ? l : x)) } : c))}
          unnamedHint={t("Add its name in Your background to show it on your profile.")}
          margin="18px 2px 4px"
        />
      )}
      <ObTerms
        on={pro.termsAccepted}
        onChange={(on) => {
          setPro((p) => ({ ...p, termsAccepted: on }));
          if (on) setTermsError(null);
        }}
        error={termsError && t(termsError)}
        disabled={busy}
      />
    </ObStep>
  );
};
