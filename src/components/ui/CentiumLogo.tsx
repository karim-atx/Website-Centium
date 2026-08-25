import React from "react";

// V8 (QA 8.0): "does not resemble the attached picture" — redrawn from
// scratch against the reference mark instead of resizing the old paths.
// A thick purple ring open at bottom-right (~4 to 5:30 o'clock), with a
// sage-green leaf tucked into that same notch, base near the ring's inner
// edge and tip pointing outward past it, plus a thin vein down its length.
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
      d="M39.06 80.07A32 32 0 1 1 70.58 74.51"
      stroke="#7D6BB5"
      strokeWidth="22"
      strokeLinecap="round"
      fill="none"
    />
    <path d="M55.47 65.04 Q73.55 73.78 66.4 95.1 Q55.69 80.28 55.47 65.04 Z" fill="#8FBBB2" />
    <path
      d="M55.47 65.04 Q65.09 76.86 66.4 95.1"
      stroke="#5F9187"
      strokeWidth="1.4"
      strokeLinecap="round"
      fill="none"
      opacity="0.6"
    />
  </svg>
);
