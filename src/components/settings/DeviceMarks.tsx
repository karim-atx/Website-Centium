import React, { useId } from "react";

// MO1.8 Connected devices: the brand tiles the board draws, copied from the
// handover's own assets (assets/icons/custom/MO1-8_01_apple-health-path_36.svg
// and MO1-8_02_whoop-security-span_36.svg), 36 pt. Brand marks keep their own
// colours in every theme and in dark mode (Foundations 2.1 theme rule 5, 2.4).
// The board has no Health Connect mark, so the Android row keeps its glyph.

export const AppleHealthMark: React.FC = () => {
  // One gradient per instance, so two marks on a page never share an id; only
  // id-safe characters, as it goes inside url(#…).
  const gradient = `apple-health-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg width="36" height="36" viewBox="1 1 22 22" aria-hidden style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF6B8F" />
          <stop offset="1" stopColor="#FF2D55" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#FFFFFF" stroke="rgba(0,0,0,0.08)" strokeWidth="0.8" />
      <path
        d="M12 18.2s-5.6-3.5-5.6-7.6a3 3 0 015.6-1.6 3 3 0 015.6 1.6c0 4.1-5.6 7.6-5.6 7.6z"
        fill={`url(#${gradient})`}
      />
    </svg>
  );
};

export const WhoopMark: React.FC = () => (
  <svg width="36" height="36" viewBox="1 1 22 22" aria-hidden style={{ display: "block" }}>
    <rect x="1" y="1" width="22" height="22" rx="6" fill="#000000" />
    <path d="M5.2 8.2h2l1.6 6 1.9-6h1.6l1.9 6 1.6-6h2l-2.7 8.4h-1.8L12 10.9l-1.9 5.7H8.3z" fill="#FFFFFF" />
  </svg>
);
