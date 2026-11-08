import type React from "react";

// Website viewport v1: the Community pages' shared web values (WC-CO
// Community Web v3, literal). Not a component module, so the page files
// export components only.

export const COMMUNITY_WEB_CSS = `
.co-web-press { transition: transform .15s cubic-bezier(0.22,1,0.36,1); }
.co-web-press:hover { transform: scale(0.98); }
.co-web-press:active { transform: scale(0.96); }
.co-web-back:hover { background: #F5F5F6; }
.co-web-card:hover { background: #FAFAFB !important; }
.co-web-menu-row:hover { background: #F5F5F6; }
.co-web-chip:hover { color: #241F1B; }
.co-web-more { opacity: 0; }
.co-web-card:hover .co-web-more, .co-web-reply:hover .co-web-more, .co-web-more:focus-visible, .co-web-more[aria-expanded="true"] { opacity: 1; }
.co-web-press:focus-visible, .co-web-back:focus-visible, .co-web-card:focus-visible, .co-web-menu-row:focus-visible, .co-web-chip:focus-visible, .co-web-more:focus-visible, .co-web-focus:focus-visible { outline: 2px solid #AEA1DC; outline-offset: 2px; }
.co-web-noscroll { scrollbar-width: none; }
.co-web-noscroll::-webkit-scrollbar { display: none; }
`;

/** The forum categories as the reference draws them: [label ink, strong (card edge, tile, header), dot]. */
export const CO_CATEGORY: Record<string, { ink: string; strong: string; dot: string }> = {
  workouts: { ink: "#5F5093", strong: "#6E5BB0", dot: "#7D6BB5" },
  nutrition: { ink: "#8A6A1F", strong: "#B07F22", dot: "#D9A441" },
  progress: { ink: "#2C6A4A", strong: "#4E8B6A", dot: "#1D744A" },
  motivation: { ink: "#7A3A60", strong: "#8E4670", dot: "#9C4F7C" },
  general: { ink: "#2E5E8E", strong: "#3C78B5", dot: "#4C8FD1" },
};
export const coCategory = (key: string) => CO_CATEGORY[key] ?? CO_CATEGORY.general;

/** The caps label (13/20 700, .14em, #8C8378). */
export const coCaps: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#71685E" };

/** The 44 primary button of the Community pages (#9A8CD6, r12, 15/24 600). */
export const coPrimary: React.CSSProperties = {
  height: 44,
  borderRadius: 12,
  border: "none",
  background: "#9A8CD6",
  color: "#FFFFFF",
  fontSize: 15,
  lineHeight: "24px",
  fontWeight: 600,
  whiteSpace: "nowrap",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/** The empty block (pad 40 24, r20 #F5F5F6; a 56 r16 #F0EDF9 tile with the 26 icon). */
export const coEmptyBox: React.CSSProperties = {
  flex: "none",
  padding: "40px 24px",
  boxSizing: "border-box",
  borderRadius: 20,
  background: "#F5F5F6",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  gap: 4,
};
export const coEmptyTile: React.CSSProperties = { width: 56, height: 56, borderRadius: 16, background: "#F0EDF9", display: "grid", placeItems: "center", color: "#7D6BB5" };

/** The danger line (13/20 600 #C0392B). */
export const coDanger: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#C0392B" };

/** A course's cover and hero colour: its category's when it is one of the reference's five, else the reference's course hero (#6E5BB0). */
export const coCourse = (key: string) => CO_CATEGORY[key] ?? CO_CATEGORY.workouts;
