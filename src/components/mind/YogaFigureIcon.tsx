import React from "react";

// V6 (QA 6.0): minimalistic seated-yoga-pose mark, replacing the generic
// sparkle used for Meditation — a single-color line figure, matching the
// app's icon language (see utils/icons.tsx).
export const YogaFigureIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 20,
  className,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M12 8v4.5M12 12.5c-2.2 1.6-3.6 1.6-5.5.9M12 12.5c2.2 1.6 3.6 1.6 5.5.9M8 20c1-2.4 2.2-3.8 4-4.2M16 20c-1-2.4-2.2-3.8-4-4.2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M6.5 20h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
