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
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}> = ({ title, subtitle, fill, tileFill, glyph, onClick, ariaLabel, className }) => (
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
    </span>
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

/** Weight trend: a bathroom scale, 36 pt, 1.25 stroke (frame #7567B7). */
export const ScaleGlyph: React.FC<{ color: string }> = ({ color }) => (
  <svg width={36} height={36} viewBox="0 0 36 36" fill="none" stroke={color} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="0.625" y="0.625" width="34.75" height="34.75" rx="5" />
    <path d="M9.6 9.2 A11 11 0 0 1 26.4 9.2 L22.6 13.4 A5.6 5.6 0 0 0 13.4 13.4 Z" />
    <path d="M13 7.4 L14.1 9.1 M18 6.2 L18 8.2 M23 7.4 L21.9 9.1" />
    <path d="M18 13.2 L20.6 9.6" />
  </svg>
);

/** Water: a sports bottle with a loop cap and measure ticks, 22 × 37 pt (frame #4A85C4). */
export const BottleGlyph: React.FC<{ color: string; capFill: string }> = ({ color, capFill }) => (
  <svg width={22} height={37} viewBox="0 0 22 37" fill="none" stroke={color} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3.8" y="3.4" width="9.4" height="4.6" rx="1.2" fill={capFill} />
    <circle cx="18.2" cy="3.4" r="2.6" />
    <path d="M13.2 4.6 L15.8 3.8" />
    <rect x="0.9" y="8" width="15.2" height="28.2" rx="2.6" />
    <path d="M12.6 14 H16.1 M13.8 18 H16.1 M12.6 22 H16.1 M13.8 26 H16.1 M12.6 30 H16.1" />
  </svg>
);

/** Steps with readings: the week's bars (the Home steps graphic), white on the teal tile. */
export const StepBarsGlyph: React.FC<{ values: number[]; max: number }> = ({ values, max }) => (
  <span className="flex items-end gap-[2px]" style={{ width: 34, height: 26 }}>
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
);
