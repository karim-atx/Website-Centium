import React from "react";

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
}> = ({ top, bottom, className }) => (
  <div className={`overflow-hidden ${className ?? ""}`} style={{ borderRadius: 20 }}>
    <div style={{ background: "linear-gradient(180deg,#A79AD5,#A194D1)", color: "#FFFFFF", padding: "16px 16px 14px" }}>{top}</div>
    {bottom && <div style={{ background: "#E4DDFD", padding: "12px 16px" }}>{bottom}</div>}
  </div>
);

/** The bottom band's figure / label pair (#2E2560 / #463A80). */
export const HeroStat: React.FC<{ value: React.ReactNode; label: string }> = ({ value, label }) => (
  <div className="min-w-0">
    <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#2E2560", fontVariantNumeric: "tabular-nums" }}>{value}</p>
    <p style={{ margin: "1px 0 0", fontSize: 11, fontWeight: 600, color: "#463A80" }}>{label}</p>
  </div>
);
