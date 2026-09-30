import type { WidgetConfig, WidgetSize, WidgetType } from "../types";

// Handover 2026-09-29 HO1.1 (01_GLOBAL / 03): the Home widget board is a
// CSS grid of 6 tracks. Small widgets sit `columns` to a row (2 below a
// 400px-wide viewport, 3 from 400 up); a large widget takes the full row.
// A partial row of smalls (before a large widget, or at the end) shares
// the full width equally. Returns each item's grid-column span, in order.
export const WIDGET_GRID_TRACKS = 6;

export function widgetColumns(viewportWidth: number): 2 | 3 {
  return viewportWidth < 400 ? 2 : 3;
}

export function widgetSpans(sizes: WidgetSize[], columns: 2 | 3): number[] {
  const spans: number[] = [];
  let i = 0;
  while (i < sizes.length) {
    if (sizes[i] === "large") {
      spans.push(WIDGET_GRID_TRACKS);
      i++;
      continue;
    }
    let run = 0;
    while (i + run < sizes.length && sizes[i + run] === "small") run++;
    const full = run - (run % columns);
    for (let k = 0; k < run; k++) {
      const inRow = k < full ? columns : run % columns;
      spans.push(WIDGET_GRID_TRACKS / inRow);
    }
    i += run;
  }
  return spans;
}

// Approved decision 7: Water and Food are always large, with no size toggle.
export const ALWAYS_LARGE: ReadonlySet<WidgetType> = new Set<WidgetType>(["water", "nutrition"]);

/** A widget with its size forced where decision 7 fixes it (also migrates saved boards). */
export function withFixedSize<T extends Pick<WidgetConfig, "type" | "size">>(w: T): T {
  return ALWAYS_LARGE.has(w.type) && w.size !== "large" ? { ...w, size: "large" } : w;
}
