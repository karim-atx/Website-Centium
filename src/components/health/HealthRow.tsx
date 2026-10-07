import React from "react";
import { ChevronRight } from "lucide-react";

/**
 * HE1 · Health, one row (handover-complete pass, 2026-10-07).
 *
 * Measured from frames/HE1_health.png (2x, pt = px / 2):
 *   row     358 wide, 63 tall (71 when the subtitle wraps, as Weight trend's
 *           does), radius 14, the row's own tint as fill
 *   tile    56 wide, full height, flush left, in the row's tile colour (a
 *           solid accent, or a lighter tint holding a glyph)
 *   text    16 after the tile; title 14/600 #241F1B on a 19 line, subtitle
 *           11.5/400 #8C8378 on a 15 line, 3 between (the row pads 9.5 top
 *           and bottom, so one subtitle line centres in 63 and two make 71)
 *   chevron ChevronRight 16 #8C8378, 14 from the right edge
 * The line heights are fitted to the frame's glyph positions (title cap top
 * 16.5 below the row top, subtitle 21 below that); the board gives none.
 *
 * Restore round 2 (user, 2026-10-07): the live visuals Health had on main
 * come back inside the rows. `aside` sits before the chevron (a sparkline, a
 * "Resting" pill, a category chip); `children` sits under the subtitle in the
 * text column (the BMI line, the EKG trace). Neither is drawn by the frame;
 * a row without them is the frame's row unchanged.
 */
export const HealthRow: React.FC<{
  title: string;
  subtitle: React.ReactNode;
  /** The row's fill. */
  fill: string;
  /** The 56 pt tile's fill. */
  tileFill: string;
  /** Drawn centred in the tile; none for the plain solid tiles. */
  glyph?: React.ReactNode;
  /** Before the chevron, vertically centred. */
  aside?: React.ReactNode;
  /** Under the subtitle, in the text column. */
  children?: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}> = ({ title, subtitle, fill, tileFill, glyph, aside, children, onClick, ariaLabel, className }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    className={`tap w-full flex items-stretch rounded-[14px] overflow-hidden text-left ${className ?? ""}`}
    style={{ background: fill, minHeight: 63 }}
  >
    <span aria-hidden className="w-14 shrink-0 flex items-center justify-center" style={{ background: tileFill }}>
      {glyph}
    </span>
    <span className="flex-1 min-w-0 flex flex-col justify-center" style={{ padding: "9.5px 0 9.5px 16px" }}>
      <span className="block text-[14px] font-semibold leading-[19px] text-charcoal">{title}</span>
      <span className="block mt-[3px] text-[11.5px] leading-[15px] text-charcoal-faint">{subtitle}</span>
      {children}
    </span>
    {aside && <span className="shrink-0 flex items-center pl-2">{aside}</span>}
    <span className="shrink-0 flex items-center" style={{ padding: "0 14px 0 8px" }}>
      <ChevronRight size={16} className="text-charcoal-faint" />
    </span>
  </button>
);

/** HE1 section label ("Today", "Records"): 12/600 #8C8378, uppercase as the frame draws it. */
export const HealthSectionLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={`text-[12px] font-semibold leading-4 uppercase text-charcoal-faint ${className ?? ""}`}>{children}</p>
);

// The tile glyphs the frame draws. No asset was supplied for any of them
// (recon A: "the scale (Weight) and bottle (Water) tile glyphs are not in the
// handover's assets/icons/custom"); each is drawn to the frame's own pixels.
// The bottle gave way to main's filling cup in Restore round 2 (below).

/** Weight trend: a bathroom scale, 36 pt, 1.25 stroke (frame #7567B7). */
export const ScaleGlyph: React.FC<{ color: string }> = ({ color }) => (
  <svg width={36} height={36} viewBox="0 0 36 36" fill="none" stroke={color} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="0.625" y="0.625" width="34.75" height="34.75" rx="5" />
    <path d="M9.6 9.2 A11 11 0 0 1 26.4 9.2 L22.6 13.4 A5.6 5.6 0 0 0 13.4 13.4 Z" />
    <path d="M13 7.4 L14.1 9.1 M18 6.2 L18 8.2 M23 7.4 L21.9 9.1" />
    <path d="M18 13.2 L20.6 9.6" />
  </svg>
);

/**
 * Water: the cup filling to the day's goal fraction (main's Health water
 * widget, its own 34×40 viewBox at 38×45).
 *
 * Restore round 2 (user, 2026-10-07): back in the Water tile in place of the
 * frame's bottle glyph (two vessels in one tile would say the same thing
 * twice), so the tile shows how far through the goal the day is. Light keeps
 * main's #8FC0E8 water and #5E8BB3 outline; dark lifts the outline to
 * team-blue-ink.
 */
export const WaterCupGlyph: React.FC<{ fraction: number; stroke: string }> = ({ fraction, stroke }) => {
  const f = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  return (
    <svg viewBox="0 0 34 40" width={38} height={45} style={{ display: "block", flex: "none", overflow: "visible" }} aria-hidden>
      <defs>
        <clipPath id="health-cup-clip">
          <path d="M5.2 5 H28.8 L26.4 35.2 A2.6 2.6 0 0 1 23.8 37.6 H10.2 A2.6 2.6 0 0 1 7.6 35.2 Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#health-cup-clip)">
        <rect x="0" y={40 - f * 35} width="34" height="40" fill="#8FC0E8" />
      </g>
      <path
        d="M5.2 5 H28.8 L26.4 35.2 A2.6 2.6 0 0 1 23.8 37.6 H10.2 A2.6 2.6 0 0 1 7.6 35.2 Z"
        fill="none"
        stroke={stroke}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <path d="M3.6 5 H30.4" stroke={stroke} strokeWidth={1.7} strokeLinecap="round" />
    </svg>
  );
};

/**
 * Steps with readings: the week's bars (the Home steps graphic), white on the
 * teal tile, one bar per day that HAS a step count.
 *
 * Restore round 2 (user, 2026-10-07): each bar's day letter is back under it,
 * as on main (7.5, today extrabold team-teal-ink, the rest semibold at 50%).
 */
export const StepBarsGlyph: React.FC<{ values: number[]; letters?: string[]; max: number }> = ({ values, letters, max }) => (
  <span className="flex flex-col" style={{ width: letters ? 44 : 34 }}>
    <span className="flex items-end gap-[2px]" style={{ height: 26 }}>
      {values.map((v, i) => (
        <span
          key={i}
          className="flex-1 rounded-[1px]"
          style={{
            height: `${Math.max(8, (v / (max || 1)) * 100)}%`,
            background: i === values.length - 1 ? "#FFFFFF" : "rgba(255,255,255,0.55)",
          }}
        />
      ))}
    </span>
    {letters && (
      <span className="flex gap-[2px] mt-1">
        {letters.map((l, i) => (
          <span
            key={i}
            className={`flex-1 min-w-0 text-center text-[7.5px] leading-[9px] ${
              // On the solid teal tile (not main's pale widget): full-strength
              // ink in light, white in dark; today told apart by weight only.
              i === letters.length - 1 ? "font-extrabold text-team-teal-ink dark:text-white" : "font-medium text-team-teal-ink dark:text-white"
            }`}
          >
            {l}
          </span>
        ))}
      </span>
    )}
  </span>
);
