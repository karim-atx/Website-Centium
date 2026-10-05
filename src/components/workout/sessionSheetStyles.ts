import type React from "react";

// CentiumFrame.dc.html sessionSheetBody(): option-button styling. Since the
// 2026-09-29 handover (WO23, WO24) only the Set options RPE chips use it. Selected = #A299DE
// fill + white ink; idle = white with a 1px #E7E7EC border. Radius and
// padding differ per row, so callers pass them.
// Mobile v5.1 R3 (no light islands): idle white and #241F1B are the card and
// charcoal tokens; the #E7E7EC border has no token, so its dark value
// (option border rgba(238,239,242,0.10)) comes from `dark`. The selected
// fill carries white ink and is the same in both modes.
const sessionOptionStyle = (
  selected: boolean,
  shape: { borderRadius: number; padding: string },
  dark: boolean
): React.CSSProperties => ({
  ...shape,
  fontSize: 12,
  fontWeight: 600,
  // Decision 7: selected is primary-fill and its ink (#A299DE carried white at 2.58:1).
  border: `1px solid ${selected ? "rgb(var(--c-primary-fill))" : dark ? "rgba(238,239,242,0.10)" : "#E7E7EC"}`,
  background: selected ? "rgb(var(--c-primary-fill))" : "rgb(var(--c-cream-card))",
  color: selected ? "rgb(var(--c-on-primary-fill))" : "rgb(var(--c-charcoal))",
});

// RPE_OPTIONS chips: padding 7px 12px, radius 8; the row wraps with gap 6.
export const sessionChipStyle = (selected: boolean, dark = false): React.CSSProperties =>
  sessionOptionStyle(selected, { borderRadius: 8, padding: "7px 12px" }, dark);
