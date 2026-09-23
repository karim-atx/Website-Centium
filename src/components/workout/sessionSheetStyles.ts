import type React from "react";

// CentiumFrame.dc.html sessionSheetBody(): the option buttons shared by the
// RPE calculator, plate calculator and set-options sheets. Selected = #A299DE
// fill + white ink; idle = white with a 1px #E7E7EC border. Radius and
// padding differ per row, so callers pass them.
export const sessionOptionStyle = (
  selected: boolean,
  shape: { borderRadius: number; padding: string }
): React.CSSProperties => ({
  ...shape,
  fontSize: 12,
  fontWeight: 600,
  border: `1px solid ${selected ? "#A299DE" : "#E7E7EC"}`,
  background: selected ? "#A299DE" : "#FFFFFF",
  color: selected ? "#FFFFFF" : "#241F1B",
});

// RPE_OPTIONS chips: padding 7px 12px, radius 8; the row wraps with gap 6.
export const sessionChipStyle = (selected: boolean): React.CSSProperties =>
  sessionOptionStyle(selected, { borderRadius: 8, padding: "7px 12px" });
