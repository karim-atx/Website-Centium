import type React from "react";

// Website viewport v1, section 3: the side sheet that replaces a bottom sheet
// from 1024px wide. 440 wide and full height at the inline end (the right, the
// left in Arabic); the band's 1px border and the 32 radius on the side that
// faces the page. It slides in from its edge (no movement with reduced motion).

export const WEB_SHEET_W = 440;

export const WEB_SHEET_CSS = `
@keyframes web-sheet-in { from { transform: translateX(100%); } to { transform: none; } }
@keyframes web-sheet-in-rtl { from { transform: translateX(-100%); } to { transform: none; } }
@keyframes web-sheet-out { from { transform: none; } to { transform: translateX(100%); } }
@keyframes web-sheet-out-rtl { from { transform: none; } to { transform: translateX(-100%); } }
.web-sheet { animation: web-sheet-in .35s cubic-bezier(0.22,1,0.36,1) both; }
[dir="rtl"] .web-sheet { animation-name: web-sheet-in-rtl; }
.web-sheet.web-sheet-leaving { animation: web-sheet-out .35s cubic-bezier(0.22,1,0.36,1) both; }
[dir="rtl"] .web-sheet.web-sheet-leaving { animation-name: web-sheet-out-rtl; }
@keyframes bottom-sheet-scrim-out { from { opacity: 1; } to { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .web-sheet, .web-sheet.web-sheet-leaving { animation: none; } }
html.reduce-motion .web-sheet, html.reduce-motion .web-sheet.web-sheet-leaving { animation: none; }
`;

export function webSheetPanelStyle(background: string, border: string | null): React.CSSProperties {
  return {
    width: WEB_SHEET_W,
    maxWidth: "100vw",
    height: "100dvh",
    background,
    borderStartStartRadius: 32,
    borderEndStartRadius: 32,
    ...(border ? { borderTop: border, borderBottom: border, borderInlineStart: border } : null),
  };
}
