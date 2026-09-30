import type { WidgetConfig, WidgetSize, WidgetType } from "../types";

// Handover 2026-09-29 HO1.1 (01_GLOBAL / 03): the Home widget board is a
// CSS grid of 6 tracks. Small widgets sit `columns` to a row (2 below a
// 400px-wide viewport, 3 from 400 up); a large widget takes the full row.
//
// TWO SIZES, AND A SMALL ONE IS ALWAYS SMALL (2026-09-30, replacing HO1.1's
// "a partial row stretches to fill"). Stretching made a lone small widget
// between two large ones exactly as wide as a large one, so the resize button
// only ever seemed to grow it. A small widget now always takes one column's
// width; a short row leaves the rest of the row empty. Returns each item's
// grid-column span, in order.
export const WIDGET_GRID_TRACKS = 6;

export function widgetColumns(viewportWidth: number): 2 | 3 {
  return viewportWidth < 400 ? 2 : 3;
}

export function widgetSpans(sizes: WidgetSize[], columns: 2 | 3): number[] {
  return sizes.map((size) => (size === "large" ? WIDGET_GRID_TRACKS : WIDGET_GRID_TRACKS / columns));
}

// Approved decision 7: Water and Food are always large, with no size toggle.
export const ALWAYS_LARGE: ReadonlySet<WidgetType> = new Set<WidgetType>(["water", "nutrition"]);

/** A widget with its size forced where decision 7 fixes it (also migrates saved boards). */
export function withFixedSize<T extends Pick<WidgetConfig, "type" | "size">>(w: T): T {
  return ALWAYS_LARGE.has(w.type) && w.size !== "large" ? { ...w, size: "large" } : w;
}
