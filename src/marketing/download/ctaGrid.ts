// Task O (Karim, 2026-11-09): the hero's and the closing CTA's button group.

import type React from "react";

/** The button group of the hero and the CTA. In a row: equal columns, each
 *  the widest label's width and at least `min` (ctaW), the grid as wide as
 *  its content. Stacked: one full-width column. 12px gaps, as before. */
export function ctaGrid(stack: boolean, min: string): React.CSSProperties {
  return stack
    ? { display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: "12px" }
    : { display: "grid", gridAutoFlow: "column", gridAutoColumns: `minmax(${min},1fr)`, gap: "12px", width: "fit-content" };
}
