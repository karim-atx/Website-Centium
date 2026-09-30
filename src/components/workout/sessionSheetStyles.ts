import type React from "react";

// CentiumFrame.dc.html sessionSheetBody(): option-button styling. Since the
// 2026-09-29 handover (WO23, WO24) only the Set options RPE chips use it. Selected = #A299DE
// fill + white ink; idle = white with a 1px #E7E7EC border. Radius and
// padding differ per row, so callers pass them.
const sessionOptionStyle = (
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
