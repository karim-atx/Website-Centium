import React from "react";
import clsx from "clsx";
import type { LicenceStatus } from "../../services/professional-cv";

// The CV's status marks, from the approved design: a green "Verified" pill, an
// amber "Pending review" and a red "Not approved" with the reviewer's reason
// under it; and the rosette check beside a verified professional's name.
// Literal design hexes in light mode; the status tokens in dark mode, where
// those light washes would glare.

const PILL = "text-[11px] font-bold rounded-full px-[9px] py-1 whitespace-nowrap shrink-0";

export const VerifiedPill: React.FC<{ className?: string }> = ({ className }) => (
  <span className={clsx(PILL, "bg-[#E1F2EA] text-[#1F6A48] dark:bg-status-good-bg dark:text-status-good", className)}>
    Verified
  </span>
);

export const LicenceStatusBadge: React.FC<{ status: LicenceStatus }> = ({ status }) => {
  if (status.kind === "verified") return <VerifiedPill />;
  if (status.kind === "pending")
    return (
      <span className={clsx(PILL, "bg-[#FBF1DC] text-[#7A5212] dark:bg-status-caution-bg dark:text-status-caution")}>
        Pending review
      </span>
    );
  if (status.kind === "rejected")
    return (
      <span className={clsx(PILL, "bg-[#FBE6E3] text-[#9B2C22] dark:bg-status-high-bg dark:text-status-high")}>
        Not approved
      </span>
    );
  return null;
};

/** The reviewer's reason, under a licence that was not approved. */
export const RejectionNote: React.FC<{ reason: string }> = ({ reason }) => (
  <p className="text-[12.5px] leading-[1.4] rounded-[10px] px-2.5 py-2 bg-[#FDF1EF] text-[#9B2C22] dark:bg-status-high-bg dark:text-status-high">
    {reason}
  </p>
);

/** The rosette check beside a name: at least one credential verified. */
export const VerifiedCheck: React.FC<{ size?: number; /** MO1.2.1 draws BadgeCheck 18/1.75. */ strokeWidth?: number }> = ({
  size = 16,
  strokeWidth = 2.2,
}) => (
  <svg
    role="img"
    aria-label="Verified credentials"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0 stroke-[#1F6A48] dark:stroke-status-good"
  >
    <title>Verified: at least one credential checked by the Centium team</title>
    <path d="M12 2l2.4 2.1 3.2-.3.8 3.1 2.8 1.6-1.3 2.9 1.3 2.9-2.8 1.6-.8 3.1-3.2-.3L12 22l-2.4-2.1-3.2.3-.8-3.1-2.8-1.6 1.3-2.9-1.3-2.9 2.8-1.6.8-3.1 3.2.3z" />
    <path d="M8.5 12.2l2.3 2.3 4.7-4.8" />
  </svg>
);

/**
 * The one-line meaning of the check. Not under the directory (MO1.2 doesn't
 * draw it there; the meaning is the check's own <title> above). Restore round
 * (user, 2026-10-07): back in the "Your professional" profile sheet on
 * Professionals, where it was before the handover-complete pass.
 */
export const VerifiedExplainer: React.FC = () => (
  <p className="flex items-center gap-1.5 text-xs text-charcoal-soft">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 stroke-[#1F6A48] dark:stroke-status-good">
      <path d="M8.5 12.2l2.3 2.3 4.7-4.8" />
      <circle cx="12" cy="12" r="9" />
    </svg>
    Verified: at least one credential checked by the Centium team
  </p>
);
