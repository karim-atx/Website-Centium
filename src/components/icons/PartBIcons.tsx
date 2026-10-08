import React from "react";

// v6 Part B custom icons (TK 4.1, svg/icons/custom/), drawings copied from the
// handover files with the C2PA <metadata> stripped. The three that already
// match stay where they are (nav-health = BottomNav HealthTabGlyph,
// meditation-lotus = LotusGlyph, addmetric-* / check-circle-thin =
// AddMetricSheet). These four are new or changed.

interface IconProps {
  /** Rendered px (square). */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Accessible name; decorative (aria-hidden) without it. */
  label?: string;
}

const a11y = (label?: string) =>
  label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };

/**
 * weight-scale.svg (24 grid). Replaces HealthRow's 36-grid ScaleGlyph
 * (different arc, needle and bar). The manifest's stroke: 1.25 at 16 to 17 px,
 * 1.5 at 12 px, so the default follows the size. currentColor.
 */
export const WeightScaleIcon: React.FC<IconProps & { strokeWidth?: number }> = ({ size = 16, strokeWidth, className, style, label }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth ?? (size <= 12 ? 1.5 : 1.25)}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...a11y(label)}
    className={className}
    style={style}
  >
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
    <path d="M8 10 A5 5 0 0 1 16 10" />
    <path d="M12 10.2 L13.4 7.6" />
    <path d="M9.5 16.5 H14.5" />
  </svg>
);

/** cycle-calendar.svg (24 grid, drawn at 21). Replaces CalendarHeart for the cycle metric. currentColor. */
export const CycleCalendarIcon: React.FC<IconProps> = ({ size = 21, className, style, label }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.25}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...a11y(label)}
    className={className}
    style={style}
  >
    <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
    <path d="M8 3.2 V6.6 M16 3.2 V6.6 M3.5 9.6 H20.5" />
    <circle cx="12" cy="13.2" r="1.7" />
    <circle cx="12" cy="17.6" r="1.7" />
    <circle cx="9.8" cy="15.4" r="1.7" />
    <circle cx="14.2" cy="15.4" r="1.7" />
    <circle cx="12" cy="15.4" r="0.55" fill="currentColor" />
  </svg>
);

/**
 * calories-flame.svg (24 grid, drawn at 22). Two-tone in the fixed calories
 * metric colours (outline #B07A35, inner #D9A15B at 55%), which stay the same
 * in every theme (TK 2.2). The props exist for a frame that gives other
 * values (dark); the defaults are the handover file's.
 */
export const CaloriesFlameIcon: React.FC<IconProps & { stroke?: string; fill?: string; fillOpacity?: number }> = ({
  size = 22,
  stroke = "#B07A35",
  fill = "#D9A15B",
  fillOpacity = 0.55,
  className,
  style,
  label,
}) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...a11y(label)} className={className} style={style}>
    <path
      d="M12 21.5c-3.9 0-6.5-2.6-6.5-6.1 0-2.3 1.3-4.2 2.6-5.6.3 1.4 1 2.4 2 2.9-.5-3.4 1-6.4 3.7-8.7.1 2.6 1.6 4.4 3.1 6 1.1 1.2 1.6 2.9 1.6 4.6 0 4.2-2.6 6.9-6.5 6.9Z"
      fill="none"
      stroke={stroke}
      strokeWidth={1.25}
      strokeLinejoin="round"
    />
    <path
      d="M12 19.2c-1.7 0-2.8-1.1-2.8-2.7 0-1.3.8-2.3 1.7-3.1.1.8.5 1.3 1 1.5-.1-1.5.5-2.7 1.6-3.6.2 1.1.9 1.9 1.4 2.6.4.6.6 1.3.6 2 0 1.9-1.4 3.3-3.5 3.3Z"
      fill={fill}
      fillOpacity={fillOpacity}
    />
  </svg>
);

/**
 * avatar-placeholder.svg (40 grid, drawn at 52): head and shoulders, cropped
 * by the bottom edge. The handover draws it #B7ABDE on a lavender circle; the
 * circle is the caller's (it owns size, radius and ground), the figure takes
 * `color` (default #B7ABDE through its theme variable).
 */
export const AvatarPlaceholder: React.FC<IconProps & { color?: string }> = ({
  size = 52,
  color = "rgb(var(--th-b7abde, 183 171 222))",
  className,
  style,
  label,
}) => (
  <svg viewBox="0 0 40 40" width={size} height={size} {...a11y(label)} className={className} style={style}>
    <circle cx="20" cy="16" r="7.2" fill={color} />
    <path d="M5.5 40c1.5-8 7.4-12.6 14.5-12.6S33 32 34.5 40Z" fill={color} />
  </svg>
);
