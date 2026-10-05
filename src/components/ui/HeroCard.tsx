import React from "react";
import { useIsDark } from "../../hooks/useIsDark";

/**
 * Mobile v5.1 R3, dark mode (no light islands), as [light, dark]: the purple
 * top is the light lavender #A79AD5 in light mode only; dark mode draws it in
 * the app's dark lavender accent (--gradient-lavender-accent, #54468A to
 * #3B3168), where its 72-100% white text reads at 5.3:1 or more. The light
 * bottom band takes primary.tint dark (#303141), its numbers text.primary dark
 * and its labels primary.deeper dark. The band sets them as --hero-value and
 * --hero-label, so band content drawn by the caller follows the mode too.
 */
const BAND = {
  bg: ["#E4DDFD", "#303141"],
  value: ["#2E2560", "#F5F3FA"],
  label: ["#463A80", "#C8BFE9"],
} as const;


/**
 * The shared hero card, handover 2026-09-29 02 "Hero card (History /
 * Metrics)": a top part in flat History-tab purple #A79AD5 (very subtle to
 * #A194D1) with white text, and a bottom band in light purple #E4DDFD with
 * deep-lavender text (#2E2560 numbers, #463A80 labels), meeting the top at a
 * crisp horizontal edge — no blend, no divider. Radius 20. Used by WO3.1 and
 * WO4.1.
 */
export const HeroCard: React.FC<{
  top: React.ReactNode;
  bottom?: React.ReactNode;
  className?: string;
  /** Per-screen padding, measured from each frame (WO3.1 differs from WO4.1). */
  topPadding?: string;
  bottomPadding?: string;
}> = ({ top, bottom, className, topPadding = "16px 16px 14px", bottomPadding = "12px 16px" }) => {
  const dark = useIsDark();
  return (
    <div className={`overflow-hidden ${className ?? ""}`} style={{ borderRadius: 20 }}>
      <div style={{ background: dark ? "var(--gradient-lavender-accent)" : "linear-gradient(180deg,#A79AD5,#A194D1)", color: "#FFFFFF", padding: topPadding }}>{top}</div>
      {bottom && (
        <div
          style={{
            background: BAND.bg[dark ? 1 : 0],
            padding: bottomPadding,
            ["--hero-value" as string]: BAND.value[dark ? 1 : 0],
            ["--hero-label" as string]: BAND.label[dark ? 1 : 0],
          }}
        >
          {bottom}
        </div>
      )}
    </div>
  );
};

/** The bottom band's figure / label pair (#2E2560 / #463A80). */
export const HeroStat: React.FC<{ value: React.ReactNode; label: string }> = ({ value, label }) => (
  <div className="min-w-0">
    <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--hero-value)", fontVariantNumeric: "tabular-nums" }}>{value}</p>
    <p style={{ margin: "1px 0 0", fontSize: 11, fontWeight: 600, color: "var(--hero-label)" }}>{label}</p>
  </div>
);
