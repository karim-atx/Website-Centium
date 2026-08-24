import React from "react";

// V5 (QA 5.0): rebrand mark — replaces the plain letter badge wherever the
// app shows its own identity (onboarding welcome screen, sidebar header).
// A purple ring ("C") with a small sage-green leaf tucked into the gap,
// matching the two-color QA 5.0 palette.
export const CentiumLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    className={className}
    aria-label="Centium"
    role="img"
  >
    <path
      d="M29.5 12.5A13 13 0 1 0 27 29"
      stroke="#AEA1DC"
      strokeWidth="6.5"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M22 20c2.5-3 7-3.4 8.4.6 1.2 3.4-1.5 7.4-5.4 7.4-2.6 0-4.2-1.4-5-3"
      fill="#A2C8C2"
    />
  </svg>
);
