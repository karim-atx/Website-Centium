import React from "react";

// V6 (QA 6.0): redrawn to match the supplied reference exactly — a thick
// purple ring open at the bottom-right, with a sage-green leaf (a pointed
// blade with a center vein) tucked into the gap.
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
      d="M31 24.5A13 13 0 1 0 20 33"
      stroke="#AEA1DC"
      strokeWidth="6.5"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M18.5 18.5c5-4.2 12.5-3 13.8 3.6 1.1 5.7-4.3 10.4-9.9 9.3-3.7-.7-6-3-6.9-5.6 2.4.4 5.1-.1 7-1.7-2.1.2-4.3-.4-5.7-1.9 1.7-.3 3.3-1.4 4.2-2.9-1.1.2-2-.1-2.5-.8Z"
      fill="#A2C8C2"
    />
  </svg>
);
