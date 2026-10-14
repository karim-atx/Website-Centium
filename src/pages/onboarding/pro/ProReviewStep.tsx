import React, { useState } from "react";
import { ObStep, ObFooter } from "../shell/ObShell";
import { ObSectionLabel, ObTerms } from "../shell/ObBlocks";
import { useOnboardingFlow, OB_STRINGS } from "../shell/flow";
import { HealthDisclaimer } from "../../../components/ui/HealthDisclaimer";
import { useApp } from "../../../context/AppContext";
import { useMyCv } from "../../../components/cv/useMyCv";
import { FORMATS, PRO_LABEL, isRegulated, initials, workSummary } from "./proModel";
import { proLaneId } from "./proLanes";
import { proChipLabel } from "./proModel";
import { ProfilePreview, SummaryCard } from "./parts";
import { ProLicencePublish } from "./ProLicencePublish";
import type { ProStepProps } from "./types";

/** What the Background summary lists, from the stored CV. */
function backgroundLine(cv: ReturnType<typeof useMyCv>["cv"]): string {
  if (!cv) return "Loading…";
  const parts: string[] = [];
  if (cv.profile.headline) parts.push("Headline");
  const lic = cv.licences.filter((l) => l.name || l.documentPath).length;
  if (lic) parts.push(`${lic} licence${lic === 1 ? "" : "s"}`);
  if (cv.experience.length) parts.push(`${cv.experience.length} role${cv.experience.length === 1 ? "" : "s"}`);
  if (cv.education.length) parts.push("education");
  if (cv.profile.skills.length) parts.push("skills");
  if (cv.languages.length) parts.push("languages");
  if (!parts.length) return "Nothing added yet, optional";
  const s = parts.join(", ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Step 6 · Review and submit (OB-152, OB-154, OB-180, OB-182, OB-183, OB-209,
 * OB-211). Every summary is the person's own answers (the frames' sample
 * values never ship); Edit opens that step and its Continue comes back here.
 * The Terms checkbox is required and recorded (B5 legal_acceptances).
 * Fitness / Other: "Go live". Physiotherapist / Dietitian: "Submit for
 * verification" (the licence check runs in the existing review queue).
 * KEEP-SAFETY: the health disclaimer sits above the submit button, so the
 * health_disclaimer acceptance recorded on submit (ProLane) is for text the
 * person has seen (same placement as the client's You're all set).
 */
export const ProReviewStep: React.FC<
  ProStepProps & { onSubmit: () => Promise<{ ok: true } | { ok: false; message: string }> }
> = ({ kind, shared, pro, setPro, onBack, goTo, onSubmit }) => {
  const flow = useOnboardingFlow();
  const { user } = useApp();
  const { cv, setCv } = useMyCv();
  const [termsError, setTermsError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const reg = isRegulated(kind);
  const chipLabel = proChipLabel(kind, pro.whatYouDo);
  const offline = !!flow && !flow.online;

  const label = kind === "other" && pro.whatYouDo.trim() ? pro.whatYouDo.trim() : PRO_LABEL[kind];
  const formats = pro.formats.filter((f) => FORMATS[kind].includes(f));
  const servicesLines = [
    pro.specialties.length ? pro.specialties.join(", ") : "No specialties yet",
    formats.length ? formats.join(", ") : "No session formats yet",
  ];
  const credLine = reg
    ? `${kind === "physio" ? "Licence" : "Registration"} ${pro.licenceNumber.trim()}${pro.registrationLicenceId ? " · proof uploaded" : ""}`
    : shared.certificationFile
    ? "Certificate uploaded, optional"
    : "No certificate yet, optional";

  const submit = async () => {
    if (!pro.termsAccepted) {
      setTermsError("Accept the Terms of Service and Privacy Policy to submit.");
      return;
    }
    if (busy || offline) return;
    setBusy(true);
    setSubmitError(null);
    const r = await onSubmit();
    setBusy(false);
    if (!r.ok) setSubmitError(r.message);
  };

  const name = shared.firstName.trim() || "Your name";

  return (
    <ObStep
      lane={proLaneId(kind)}
      chipLabel={chipLabel}
      step="review"
      title="Review and submit"
      subtitle={reg ? "One last look. Your profile goes live once your licence is checked." : "One last look. Your profile goes live as soon as you submit."}
      onBack={onBack}
      saveExit={false}
      footer={
        <ObFooter
          error={submitError ?? (offline ? OB_STRINGS.offlineSubmit : null)}
          errorTone={submitError ? "error" : "info"}
          primary={{
            label: busy ? OB_STRINGS.submitting : submitError ? OB_STRINGS.tryAgain : reg ? "Submit for verification" : "Go live",
            onClick: () => void submit(),
            disabled: busy || offline || !!termsError,
          }}
        >
          <HealthDisclaimer className="mx-auto max-w-[310px] mb-3" />
        </ObFooter>
      }
    >
      <SummaryCard n={1} heading="About you" lines={[`${name} · ${label}`]} onAction={() => goTo("about")} />
      <SummaryCard n={2} heading="Where you work" lines={[workSummary(pro, kind)]} onAction={() => goTo("work")} />
      <SummaryCard n={3} heading="Specialties and services" lines={servicesLines} onAction={() => goTo("services")} />
      <SummaryCard n={4} heading="Credentials" lines={[credLine]} onAction={() => goTo("creds")} />
      <SummaryCard n={5} heading="Your background" lines={[backgroundLine(cv)]} onAction={() => goTo("background")} />
      <ObSectionLabel title="Your public profile" margin="14px 2px 12px" />
      <ProfilePreview
        initials={initials(name)}
        avatarUrl={user.avatarUrl ?? null}
        name={name}
        type={`${label} · ${pro.workMode === "online" ? "Online" : pro.area?.label ?? "Area not set"}`}
        tags={pro.specialties.slice(0, 3)}
        line={cv?.profile.headline ?? null}
      />
      {/* OURS-licence-publish: the licences that will be on that profile, by choice, before going live. */}
      {cv && (
        <ProLicencePublish
          licences={cv.licences}
          onChanged={(l) => setCv((c) => (c ? { ...c, licences: c.licences.map((x) => (x.id === l.id ? l : x)) } : c))}
          unnamedHint="Add its name in Your background to show it on your profile."
          margin="18px 2px 4px"
        />
      )}
      <ObTerms
        on={pro.termsAccepted}
        onChange={(on) => {
          setPro((p) => ({ ...p, termsAccepted: on }));
          if (on) setTermsError(null);
        }}
        error={termsError}
        disabled={busy}
      />
    </ObStep>
  );
};
