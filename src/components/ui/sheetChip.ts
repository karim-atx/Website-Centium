import type React from "react";

// Mobile handoff item 1: the option chip used inside every bottom sheet —
// an 8px-radius rectangle, never a pill. Rows of these stay on one line and
// scroll horizontally (`flex scroll-row no-scrollbar`), never wrap.
// Mobile v5.1 R3 (no light islands): the idle chip is written as the tokens
// whose light values are its literals (surface.raised #FAFAFB, border.option
// #E5E6EB, charcoal #241F1B), so it follows the theme without a hook. The
// selected fill carries white ink and stays as it is in both modes.
// The selected chip is the board's #A092E0 with white ink in light mode
// (decision 14) and primary-fill with its ink in dark mode (--c-fill-chip).
export const sheetChipStyle = (selected: boolean): React.CSSProperties => ({
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13.5,
  whiteSpace: "nowrap",
  flex: "none",
  ...(selected
    ? { background: "rgb(var(--c-fill-chip))", border: "1px solid rgb(var(--c-fill-chip))", color: "rgb(var(--c-on-primary-fill))", fontWeight: 700 }
    : {
        background: "rgb(var(--c-surface-raised))",
        border: "1px solid rgb(var(--c-border-option))",
        color: "rgb(var(--c-charcoal))",
        fontWeight: 500,
      }),
});

// Grey sheet container and its sentence-case label (CentiumFrame addFoodBody
// `grey` / `lbl`). Alongside the chip because they dress the same sheets, and
// here rather than in AddFoodSheet because SheetField and the custom-food
// form both draw them and neither lives there any more.
export const sheetGreyStyle: React.CSSProperties = { background: "#F2F3F5", borderRadius: 14, padding: "12px 14px" };
export const sheetLabelStyle: React.CSSProperties = { margin: 0, fontSize: 13, fontWeight: 500, color: "#575863" };

// The same two for the current mode. #F2F3F5 and #575863 have no token with
// the same light value, so dark mode is spelled out: the grey container is
// surface.soft on the card (#242730) and the label is text.secondary
// (#B8B3C7, 7.3:1 on that container). Light mode returns the constants above.
const DARK_SHEET_GREY: React.CSSProperties = { ...sheetGreyStyle, background: "#242730" };
const DARK_SHEET_LABEL: React.CSSProperties = { ...sheetLabelStyle, color: "#B8B3C7" };
export const sheetGreyStyleFor = (dark: boolean): React.CSSProperties => (dark ? DARK_SHEET_GREY : sheetGreyStyle);
export const sheetLabelStyleFor = (dark: boolean): React.CSSProperties => (dark ? DARK_SHEET_LABEL : sheetLabelStyle);
