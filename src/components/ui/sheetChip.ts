import type React from "react";

// Mobile handoff item 1: the option chip used inside every bottom sheet —
// an 8px-radius rectangle, never a pill. Rows of these stay on one line and
// scroll horizontally (`flex overflow-x-auto no-scrollbar`), never wrap.
export const sheetChipStyle = (selected: boolean): React.CSSProperties => ({
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13.5,
  whiteSpace: "nowrap",
  flex: "none",
  ...(selected
    ? { background: "#A092E0", border: "1px solid #A092E0", color: "#FFFFFF", fontWeight: 700 }
    : { background: "#FAFAFB", border: "1px solid #E5E6EB", color: "#241F1B", fontWeight: 500 }),
});

// Grey sheet container and its sentence-case label (CentiumFrame addFoodBody
// `grey` / `lbl`). Alongside the chip because they dress the same sheets, and
// here rather than in AddFoodSheet because SheetField and the custom-food
// form both draw them and neither lives there any more.
export const sheetGreyStyle: React.CSSProperties = { background: "#F2F3F5", borderRadius: 14, padding: "12px 14px" };
export const sheetLabelStyle: React.CSSProperties = { margin: 0, fontSize: 13, fontWeight: 500, color: "#575863" };
