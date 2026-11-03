import React from "react";

// Web-only sidebar glyphs (Website viewport v1, board Icon / WB Icon). Lucide
// geometry at 24 in the nav inks; the active state fills the shape and knocks
// the inner lines out in white, as the mobile bar does.

interface GlyphProps {
  active: boolean;
  color: string;
  size?: number;
}

const Svg: React.FC<{ size: number; color: string; children: React.ReactNode; sw?: number }> = ({ size, color, children, sw = 1.6 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    style={{ color, display: "block", flex: "none" }}
  >
    {children}
  </svg>
);

/** Home (client): the house, filled when active. */
export const HomeGlyph: React.FC<GlyphProps> = ({ active, color, size = 24 }) => (
  <Svg size={size} color={color}>
    {active ? (
      <>
        <path d="M3.5 10.2 12 3.5l8.5 6.7v9.3a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5Z" fill="currentColor" />
        <path d="M10 21v-4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V21" stroke="#FFFFFF" />
      </>
    ) : (
      <path d="M3.5 10.2 12 3.5l8.5 6.7v9.3a1.5 1.5 0 0 1-1.5 1.5h-4v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5H5a1.5 1.5 0 0 1-1.5-1.5Z" />
    )}
  </Svg>
);

// lucide HeartPulse, as the mobile bar's Health glyph (BottomNav).
const HEART = "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z";
const ECG = "M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27";

export const HealthGlyph: React.FC<GlyphProps> = ({ active, color, size = 24 }) => (
  <Svg size={size} color={color}>
    <path d={HEART} fill={active ? "currentColor" : "none"} />
    <path d={ECG} stroke={active ? "#FFFFFF" : "currentColor"} />
  </Svg>
);

/** Dashboard (business, WB Sidebar dash 2): three panels. */
export const DashboardGlyph: React.FC<GlyphProps> = ({ color, size = 24 }) => (
  <Svg size={size} color={color}>
    <rect width="7.5" height="18" x="3" y="3" rx="1.5" />
    <rect width="7.5" height="7.5" x="13.5" y="3" rx="1.5" />
    <rect width="7.5" height="7.5" x="13.5" y="13.5" rx="1.5" />
  </Svg>
);

/** More (•••): 1.6 idle, 2.6 active. */
export const MoreDotsGlyph: React.FC<GlyphProps> = ({ active, color, size = 24 }) => (
  <Svg size={size} color={color} sw={active ? 2.6 : 1.6}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </Svg>
);
