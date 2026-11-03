import type React from "react";

// Website viewport v1 · WC-WO Workout (WC-WO Workout Web v13): the style
// values the four web tabs share, from the reference file.

/** Caps section label ("Folders", "Summary", "Logged sessions"): 13/20 600, 0.08em. */
export const capsLabel = (color = "#9A94B3"): React.CSSProperties => ({
  margin: 0,
  fontSize: 13,
  lineHeight: "20px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color,
});

/** Card section head ("One-rep maxes", "Balance"): 17/24 700. */
export const cardTitle: React.CSSProperties = { margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" };

/** The bordered card on every tab (aside, Metrics sections): 1px #EEEDED, r16. */
export const borderCard: React.CSSProperties = { border: "1px solid #EEEDED", borderRadius: 16, boxSizing: "border-box", background: "#FFFFFF" };

/** A 40 button: label 15/24 600, r12, icon gap 8. */
export const button40: React.CSSProperties = {
  height: 40,
  padding: "0 16px",
  borderRadius: 12,
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  gap: 8,
  whiteSpace: "nowrap",
  fontSize: 15,
  lineHeight: "24px",
  fontWeight: 600,
};

/** Popup buttons (section 3): 44 tall, r12, 15/24 600. */
export const popupButton: React.CSSProperties = { flex: 1, height: 44, borderRadius: 12, border: "none", fontSize: 15, lineHeight: "24px", fontWeight: 600 };
