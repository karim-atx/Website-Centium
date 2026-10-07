import React from "react";

// The magnifier-over-a-pulse glyph MO1.5 draws for both Cycle tracking and
// Advanced health monitoring. Geometry copied verbatim from the handover
// (assets/icons/custom/MO1-5-4_01_advanced-health-monitoring_20.svg: 20 px,
// viewBox -5 -4.5 32 32, stroke 1.75, metadata stripped). The pulse line runs
// under the lens; the wide ring drawn first in the tile's own colour
// (#F0EDF9 there, `primary-pale` here so it follows every theme and dark
// mode) clears the line around the lens, and the lens and handle go on top
// in currentColor (#7D6BB5 on the board, `text-primary-dark` at the call).
export const HealthScanIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="-5 -4.5 32 32"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ display: "block" }}
    aria-hidden="true"
  >
    <path d="M-4.5 10.5H3.6q1.1-2.4 2.2 0H7l.7 1.6 1.5-8.6 1.7 11.8 1-4.8h1.3q1.6-3.4 3.2 0H26.5" />
    <circle cx="10.5" cy="10.5" r="7.5" strokeWidth={3.5} className="stroke-primary-pale" />
    <circle cx="10.5" cy="10.5" r="7.5" />
    <path d="m21 21-5.2-5.2" />
  </svg>
);
