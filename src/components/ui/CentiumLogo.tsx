import React from "react";

// V9 (QA 9.0): "Replace all instances where the logo was used with this" —
// redrawn again against the new reference mark, now a clean "C" letterform
// (a wide ~255° ring with a flat/angled butt-cap opening, not a small round-
// capped notch) with the leaf tucked into the ring's lower opening arm,
// its tip staying well short of the ring's upper arm so the negative-space
// gap between them reads clearly, per the reference.
// Wordmark is intentionally not part of this SVG — callers that want the
// "CENTIUM" text render it separately (see WelcomeStep/Subscription).
export const CentiumLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className={className}
    aria-label="Centium"
    role="img"
  >
    <path
      d="M 65.5 22.0 A 33 33 0 1 0 64.5 78.6"
      stroke="#7D67D9"
      strokeWidth="17"
      strokeLinecap="butt"
      fill="none"
    />
    <path d="M55,92 Q102,86 96,66 Q66,70 55,92 Z" fill="#7FBFAE" />
    <path
      d="M66,82 Q78,77 90,68"
      stroke="#ffffff"
      strokeWidth="1.4"
      strokeLinecap="round"
      fill="none"
      opacity="0.55"
    />
  </svg>
);
