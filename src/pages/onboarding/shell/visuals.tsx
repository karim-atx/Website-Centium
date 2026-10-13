import React from "react";
import { MARK_C_PATH, MARK_LEAF_PATH } from "../../../components/icons/CentiumMark";

// The handover's little drawings, built the same way its components build
// them (SharedOnboardingV4 / BizOnboardingV10 `LF`, `RC`, `CI` helpers and the
// `COMP` leaf compositions), so every lane draws its chip, card and status
// visuals from one place. Colours are the shell's palette variables
// (onboarding.css), so dark, themes and High contrast follow.

export const OB = {
  leaf: "var(--ob-leaf)",
  brand: "var(--ob-brand)",
  lav: "var(--ob-lav)",
  pale: "var(--ob-pale)",
  card: "var(--ob-card)",
  high: "var(--ob-high)",
  water: "var(--ob-water)",
  ink: "var(--ob-ink)",
} as const;

export type Shape =
  | { k: "L"; t: string; f: string; o?: number }
  | { k: "R"; x: number; y: number; w: number; h: number; rx: number; f: string; s?: string; sw?: number; t?: string; o?: number }
  | { k: "C"; cx: number; cy: number; r: number; f: string; s?: string; sw?: number; o?: number };

/** LF(x, y, scale, rotate, fill, opacity): a leaf placed by its stem. */
export const LF = (x: number, y: number, sc: number, r: number, f: string, o?: number): Shape => ({
  k: "L",
  t: `translate(${x} ${y}) scale(${sc}) rotate(${r}) translate(-566 -884)`,
  f,
  o: o ?? 1,
});
export const RC = (
  x: number,
  y: number,
  w: number,
  h: number,
  rx: number,
  f: string,
  o: { s?: string; sw?: number; t?: string; o?: number } = {}
): Shape => ({ k: "R", x, y, w, h, rx, f, s: o.s, sw: o.sw, t: o.t, o: o.o ?? 1 });
export const CI = (cx: number, cy: number, r: number, f: string, o: { s?: string; sw?: number; o?: number } = {}): Shape => ({
  k: "C",
  cx,
  cy,
  r,
  f,
  s: o.s,
  sw: o.sw,
  o: o.o ?? 1,
});

/** Shapes in a 0 0 100 100 box. */
export const Shapes: React.FC<{ shapes: Shape[]; size: number; className?: string; style?: React.CSSProperties }> = ({
  shapes,
  size,
  className,
  style,
}) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden className={className} style={{ overflow: "visible", display: "block", ...style }}>
    {shapes.map((s, i) =>
      s.k === "L" ? (
        <path key={i} d={MARK_LEAF_PATH} fill={s.f} transform={s.t} opacity={s.o} />
      ) : s.k === "R" ? (
        <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} fill={s.f} stroke={s.s ?? "none"} strokeWidth={s.sw ?? 0} transform={s.t || undefined} opacity={s.o} />
      ) : (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.f} stroke={s.s ?? "none"} strokeWidth={s.sw ?? 0} opacity={s.o} />
      )
    )}
  </svg>
);

/** BizOnboardingV10 VIS for the lane chips (20×20). Lanes add their own key. */
export const LANE_CHIP_VIS: Record<string, Shape[]> = {
  client: [CI(50, 54, 30, "none", { s: OB.lav, sw: 2.5, o: 0.7 }), LF(50, 74, 0.085, -45, OB.leaf)],
};

/** SharedOnboardingV4 COMP: the account-type leaf compositions (stem at 575 884). */
export type Composition = "personal" | "professional" | "business";
const S = "575 884";
export const COMP: Record<Composition, { vb: string; leaves: { f: string; t: string }[] }> = {
  personal: { vb: "540 520 420 400", leaves: [{ f: OB.leaf, t: "" }] },
  professional: {
    vb: "190 520 770 400",
    leaves: [
      { f: OB.leaf, t: "" },
      { f: OB.brand, t: "translate(1150 0) scale(-1 1)" },
    ],
  },
  business: {
    vb: "200 470 760 450",
    leaves: [
      { f: OB.leaf, t: "" },
      { f: OB.lav, t: `rotate(-45 ${S})` },
      { f: OB.brand, t: `rotate(-90 ${S})` },
    ],
  },
};

/** A COMP drawing in a square box (the handover sets width = height, so the viewBox fits inside). */
export const Composed: React.FC<{ comp: Composition; w: number; h?: number; className?: string; style?: React.CSSProperties }> = ({
  comp,
  w,
  h,
  className,
  style,
}) => (
  <svg viewBox={COMP[comp].vb} width={w} height={h ?? w} aria-hidden className={className} style={{ overflow: "visible", display: "block", ...style }}>
    {COMP[comp].leaves.map((l, i) => (
      <path key={i} d={MARK_LEAF_PATH} fill={l.f} transform={l.t || undefined} />
    ))}
  </svg>
);

/** The intro chip's 16×16 business fan (SharedOnboardingV4 chip). */
export const IntroChipFan: React.FC = () => (
  <svg viewBox="200 470 760 450" width={16} height={16} aria-hidden style={{ overflow: "visible", display: "block" }}>
    <path d={MARK_LEAF_PATH} fill={OB.leaf} />
    <path d={MARK_LEAF_PATH} fill={OB.lav} transform={`rotate(-45 ${S})`} />
    <path d={MARK_LEAF_PATH} fill={OB.brand} transform={`rotate(-90 ${S})`} />
  </svg>
);

// The wordmark strokes (viewBox 204 44 849 93), as the handover draws the
// header lockup and Welcome lockup.
export const WORDMARK_STROKES = [
  "M 213 58.5 H 272",
  "M 221.5 82 V 129 M 221.5 89.5 H 267 M 221.5 121.5 H 272",
  "M 376.5 51 V 129 M 429.5 51 V 129 M 376.5 51 L 429.5 129",
  "M 532 59.5 H 596 M 564 51 V 129",
  "M 700 51 V 129",
  "M 814.5 51 V 95.5 A 26 26 0 0 0 866.5 95.5 V 51",
  "M 980 129 V 51 L 1012 111 L 1044 51 V 129",
];
/** The full "CENTIUM" letters of the logo animation (viewBox 48 44 1005 93). */
export const WORDMARK_FULL = ["M 113.4 69.9 A 32 32 0 1 0 113.4 110.1", ...[
  "M 213 58.5 H 272 M 221.5 82 V 129 M 221.5 89.5 H 267 M 221.5 121.5 H 272",
  "M 376.5 51 V 129 M 429.5 51 V 129 M 376.5 51 L 429.5 129",
  "M 532 59.5 H 596 M 564 51 V 129",
  "M 700 51 V 129",
  "M 814.5 51 V 95.5 A 26 26 0 0 0 866.5 95.5 V 51",
  "M 980 129 V 51 L 1012 111 L 1044 51 V 129",
]];

export const MarkSvg: React.FC<{ size: number; className?: string; style?: React.CSSProperties }> = ({ size, className, style }) => (
  <svg viewBox="270 180 690 730" width={size} height={size} aria-hidden className={className} style={{ overflow: "visible", display: "block", ...style }}>
    <path d={MARK_C_PATH} fill={OB.brand} />
    <path d={MARK_LEAF_PATH} fill={OB.leaf} />
  </svg>
);

export const Wordmark: React.FC<{ width: number; height: number; className?: string; style?: React.CSSProperties }> = ({
  width,
  height,
  className,
  style,
}) => (
  <svg viewBox="204 44 849 93" width={width} height={height} role="img" aria-label="Centium" className={className} style={{ overflow: "visible", display: "block", ...style }}>
    <g stroke="currentColor" strokeWidth={17} fill="none">
      {WORDMARK_STROKES.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  </svg>
);

/** The leaf outline behind the intro screens. */
export const LeafBackdrop: React.FC = () => (
  <svg viewBox="560 520 400 400" className="ob-backdrop" aria-hidden>
    <path d={MARK_LEAF_PATH} fill="none" stroke={OB.water} strokeWidth={3} />
  </svg>
);
