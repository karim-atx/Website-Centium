import React from "react";

// v6 Business UI navbar glyphs (TK 4.2, OURS-NAV-glyphs G1 to G12): 24 grid,
// 1.6 stroke, round caps and joins. One component per glyph with an `active`
// prop instead of three files each:
// - idle: outline in currentColor, default --c-team-nav-idle (#9A94B3 light,
//   #8A8698 dark = the *-idle / *-idle-dark files, which differ only in that
//   colour).
// - active: body in currentColor, default --c-team-nav-accent (#8F68F6), with
//   the inner lines in `inner` (#FFFFFF; the handover's active files are the
//   same in light and dark).
// Schedule, Front desk, Orders and Products are copied from
// handoff/icons/nav-*-{active,idle,idle-dark}.svg (metadata stripped);
// Analytics, Operations, Marketplace and More are the OURS-NAV-glyphs
// drawings of ClientNavBarV3.dc.html's inline SVG.

export interface BusinessNavGlyphProps {
  active: boolean;
  /** Rendered px, square. The bar draws 24; the sidebar draws 22. */
  size?: number;
  /** Body / outline ink. Defaults to the navbar accent (active) or idle token. */
  color?: string;
  /** The active glyph's inner lines. */
  inner?: string;
  className?: string;
  style?: React.CSSProperties;
}

const NAV_ACCENT = "rgb(var(--c-team-nav-accent))";
const NAV_IDLE = "rgb(var(--c-team-nav-idle))";
const SW = 1.6;

const Svg: React.FC<BusinessNavGlyphProps & { children: React.ReactNode }> = ({ active, size = 24, color, className, style, children }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    aria-hidden
    className={className}
    style={{ display: "block", flex: "none", color: color ?? (active ? NAV_ACCENT : NAV_IDLE), ...style }}
  >
    {children}
  </svg>
);

/** nav-schedule-*.svg (calendar). */
export const ScheduleNavGlyph: React.FC<BusinessNavGlyphProps> = (p) => (
  <Svg {...p}>
    <rect width="18" height="18" x="3" y="4" rx="2" fill={p.active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={SW} />
    <path d="M3 10h18" stroke={p.active ? (p.inner ?? "#FFFFFF") : "currentColor"} strokeWidth={SW} />
    <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" />
  </Svg>
);

/** nav-front-desk-*.svg (scan frame). The idle file draws its inner square with no fill and no stroke, so idle shows only the corners and the line. */
export const FrontDeskNavGlyph: React.FC<BusinessNavGlyphProps> = (p) => (
  <Svg {...p}>
    {p.active && <rect width="10" height="10" x="7" y="7" rx="2" fill="currentColor" />}
    <path
      d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"
      stroke="currentColor"
      strokeWidth={SW}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M7 12h10" stroke={p.active ? (p.inner ?? "#FFFFFF") : "currentColor"} strokeWidth={SW} strokeLinecap="round" />
  </Svg>
);

/** nav-orders-*.svg (package). */
export const OrdersNavGlyph: React.FC<BusinessNavGlyphProps> = (p) => (
  <Svg {...p}>
    <path
      d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"
      fill={p.active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={SW}
      strokeLinejoin="round"
    />
    <path
      d="M12 22V12M3.3 7l7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"
      stroke={p.active ? (p.inner ?? "#FFFFFF") : "currentColor"}
      strokeWidth={SW}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** nav-products-*.svg (shopping bag). */
export const ProductsNavGlyph: React.FC<BusinessNavGlyphProps> = (p) => (
  <Svg {...p}>
    <path
      d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"
      fill={p.active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={SW}
      strokeLinejoin="round"
    />
    <path d="M3 6h18" stroke="currentColor" strokeWidth={SW} />
    <path d="M16 10a4 4 0 0 1-8 0" stroke={p.active ? (p.inner ?? "#FFFFFF") : "currentColor"} strokeWidth={SW} strokeLinecap="round" />
  </Svg>
);

/** OURS G1 to G3 (lucide ChartColumn). Active: the bars at 3.0, no inner lines (there is no body to cut). */
export const AnalyticsNavGlyph: React.FC<BusinessNavGlyphProps> = (p) => (
  <Svg {...p}>
    <path d="M3 3v16a2 2 0 0 0 2 2h16" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 17V9M13 17V5M8 17v-3" stroke="currentColor" strokeWidth={p.active ? 3 : SW} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const OP_HANDLE = "M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16";

/** OURS G4 to G6 (lucide Briefcase). Active: filled case, the handle's lower part inside it drawn in `inner`. */
export const OperationsNavGlyph: React.FC<BusinessNavGlyphProps> = (p) => {
  const clip = `nav-op-clip-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const line = { strokeWidth: SW, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <Svg {...p}>
      {p.active ? (
        <>
          <defs>
            <clipPath id={clip}>
              <rect x="2" y="6" width="20" height="14" rx="2" />
            </clipPath>
          </defs>
          <rect x="2" y="6" width="20" height="14" rx="2" fill="currentColor" stroke="currentColor" {...line} />
          <path d={OP_HANDLE} stroke="currentColor" {...line} />
          <g clipPath={`url(#${clip})`}>
            <path d={OP_HANDLE} stroke={p.inner ?? "#FFFFFF"} {...line} />
          </g>
          <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" {...line} />
        </>
      ) : (
        <>
          <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" {...line} />
          <path d={OP_HANDLE} stroke="currentColor" {...line} />
        </>
      )}
    </Svg>
  );
};

const TAG =
  "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z";

/** OURS G7 to G9 (lucide Tag). Active: filled tag, a white rim inside the outline and a white dot (ClientNavBarV2/V3 mkClip). */
export const MarketplaceNavGlyph: React.FC<BusinessNavGlyphProps> = (p) => {
  const clip = `nav-mk-clip-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const inner = p.inner ?? "#FFFFFF";
  const line = { strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <Svg {...p}>
      {p.active ? (
        <>
          <defs>
            <clipPath id={clip}>
              <path d={TAG} />
            </clipPath>
          </defs>
          <path d={TAG} fill="currentColor" stroke="currentColor" strokeWidth={SW} {...line} />
          <g clipPath={`url(#${clip})`}>
            <path d={TAG} stroke={inner} strokeWidth={4.6} {...line} />
          </g>
          <path d={TAG} stroke="currentColor" strokeWidth={SW} {...line} />
          <circle cx="7.5" cy="7.5" r="1.6" fill={inner} />
        </>
      ) : (
        <>
          <path d={TAG} stroke="currentColor" strokeWidth={SW} {...line} />
          <circle cx="7.5" cy="7.5" r="0.5" fill="currentColor" />
        </>
      )}
    </Svg>
  );
};

/** OURS G10 to G12 (lucide Ellipsis). Active: stroke 2.6 (bigger dots), no fill. */
export const MoreNavGlyph: React.FC<BusinessNavGlyphProps> = (p) => {
  const sw = p.active ? 2.6 : SW;
  return (
    <Svg {...p}>
      {[12, 19, 5].map((cx) => (
        <circle key={cx} cx={cx} cy="12" r="1" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
};
