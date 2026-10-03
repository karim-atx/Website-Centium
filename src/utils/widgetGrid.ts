import type { WidgetSize } from "../types";

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

/**
 * HOW LONG THE EDIT CONTROLS IGNORE TAPS AFTER A RESIZE. A resize reflows the
 * grid, so the control moves out from under the finger and the next tap of a
 * quick double or repeated tap lands on whatever moved there: the tile's own
 * body, a neighbour's resize, or a neighbour's REMOVE. Half a second covers
 * a fast repeat tap without making a deliberate second tap feel ignored.
 */
export const EDIT_TAP_LOCK_MS = 500;

/** The board's tap guard: `resized(now)` after a resize, `allowed(now)` before any edit action. */
export function createEditTapGuard() {
  let lockedUntil = 0;
  return {
    resized(now: number) {
      lockedUntil = now + EDIT_TAP_LOCK_MS;
    },
    allowed(now: number) {
      return now >= lockedUntil;
    },
  };
}
