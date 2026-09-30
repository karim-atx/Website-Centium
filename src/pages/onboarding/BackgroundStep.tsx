import React from "react";
import { OnboardingShell } from "./OnboardingShell";
import { Button } from "../../components/ui/Button";
import { CvEditor } from "../../components/cv/CvEditor";
import { useMyCv } from "../../components/cv/useMyCv";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

/**
 * "Your professional background": the optional CV step after About you.
 *
 * NOTHING HERE WAITS FOR THE END OF ONBOARDING. Each entry is written the
 * moment it is saved, like the certificate one step earlier, so leaving the
 * flow halfway loses nothing and there is nothing for finish() to send. The
 * certificate attached on About you is already licence #1 — the database
 * creates that row from the upload — and appears here read from the server.
 *
 * One footer button, "Skip" until something is added and "Continue" after,
 * the same single button the other optional steps use.
 */
export const BackgroundStep: React.FC<Props> = ({ onNext, onBack }) => {
  const { cv, setCv, error, reload, userId } = useMyCv();

  const added =
    !!cv &&
    (!!cv.profile.headline ||
      cv.licences.some((l) => l.name) ||
      cv.experience.length > 0 ||
      cv.education.length > 0 ||
      cv.profile.skills.length > 0 ||
      cv.languages.length > 0);

  return (
    <OnboardingShell
      title="Your professional background"
      subtitle="Clients see this on your public profile. Everything is optional, and you can add more later from your Profile."
      onBack={onBack}
      footer={
        <Button fullWidth size="lg" onClick={onNext}>
          {added ? "Continue" : "Skip"}
        </Button>
      }
    >
      {!userId ? (
        <p className="text-sm text-charcoal-soft">Sign in again to add your background, or skip this for now.</p>
      ) : error && !cv ? (
        <p className="text-sm text-status-high">{error}</p>
      ) : !cv ? (
        <p className="text-sm text-charcoal-faint">Loading…</p>
      ) : (
        <CvEditor variant="onboarding" userId={userId} cv={cv} setCv={setCv} reload={reload} />
      )}
    </OnboardingShell>
  );
};
