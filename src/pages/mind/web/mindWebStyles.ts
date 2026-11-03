import type React from "react";

// Website viewport v1: the Mind pages' shared web styles (WC-MI Mind Web v5).

export const MIND_WEB_CSS = `
.mind-web-press { transition: transform .15s cubic-bezier(0.22,1,0.36,1); }
.mind-web-press:hover { transform: scale(0.98); }
.mind-web-press:active { transform: scale(0.96); }
.mind-web-back:hover { background: #F5F5F6; }
.mind-web-hover:hover { background: #FAFAFB; }
.mind-web-folder:hover { background: #F5F5F6; }
.mind-web-press:focus-visible, .mind-web-back:focus-visible, .mind-web-hover:focus-visible, .mind-web-folder:focus-visible, .mind-web-focus:focus-visible { outline: 2px solid #AEA1DC; outline-offset: 2px; }
.mind-web-thumb { transition: background-color .15s; }
.mind-web-thumb:hover { background: #9A8CD6 !important; }
.mind-web-noscroll { scrollbar-width: none; }
.mind-web-noscroll::-webkit-scrollbar { display: none; }
`;

/** The caps label (13/20 700, .14em). */
export const mindCaps: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#8C8378" };

/** The primary 40 button of the Mind pages (#9A8CD6, r12, 15/24 600). */
export const mindPrimary: React.CSSProperties = {
  height: 40,
  padding: "0 16px",
  borderRadius: 12,
  background: "#9A8CD6",
  color: "#FFFFFF",
  display: "flex",
  alignItems: "center",
  gap: 8,
  whiteSpace: "nowrap",
  fontSize: 15,
  lineHeight: "24px",
  fontWeight: 600,
};
