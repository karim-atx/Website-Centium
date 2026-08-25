import React from "react";

// V6 (QA 6.0): a thick purple ring open at the bottom-right, with a
// sage-green leaf tucked into the gap.
// V7 (QA 7.0): "resize the logo so it does not appear crammed or squished"
// — the artwork left noticeable dead space around it inside its 40x40
// viewBox, so it's scaled up and recentered via a group transform rather
// than hand-editing the path math (which is error-prone for this shape).
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
    <g transform="translate(20 20) scale(1.25) translate(-20 -20)">
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
    </g>
  </svg>
);
