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

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const inside = (x: number, y: number, b: Box) => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;

/**
 * WHERE A DRAGGED TILE WILL LAND, from the pointer and the live rects of the
 * other tiles (in board order) and of the drop placeholder. Returns the
 * insert index among the other tiles, or null to leave it where it is.
 *
 * Over the placeholder: null, because that is already where it lands (and
 * keeping it stops the reflow that moving it would cause from flickering).
 * Anywhere else on the board, the nearest tile (same row first) decides, not only a tile the
 * pointer is inside: over a gap, an empty cell at the end of a short row, or
 * below the last tile, the slot still follows the finger. Above or below that
 * tile means before or after it; level with it, its left or right half does.
 */
export function dropSlot(x: number, y: number, others: Box[], placeholder: Box | null): number | null {
  if (placeholder && inside(x, y, placeholder)) return null;
  let best = -1;
  let bestDist = Infinity;
  others.forEach((b, i) => {
    const dx = x < b.left ? b.left - x : x > b.right ? x - b.right : 0;
    const dy = y < b.top ? b.top - y : y > b.bottom ? y - b.bottom : 0;
    // Same row first: the vertical distance decides, the horizontal one only
    // breaks ties, so an empty cell at the end of a row belongs to that row.
    const d = dy * 10_000 + dx;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  if (best === -1) return null;
  const b = others[best];
  const after = y > b.bottom ? true : y < b.top ? false : x > b.left + (b.right - b.left) / 2;
  return after ? best + 1 : best;
}

/**
 * The board shows only the visible widgets (some types are hidden), but the
 * stored list holds them all, and reorderWidgets moves by position in THAT
 * list. Maps "move the visible widget `movedId` to visible slot `dropIndex`
 * (among the others)" onto stored positions: it goes immediately before the
 * visible widget that will follow it, or right after the last visible one.
 */
export function storedMove(
  storedIds: string[],
  visibleIds: string[],
  movedId: string,
  dropIndex: number
): { from: number; to: number } | null {
  const from = storedIds.indexOf(movedId);
  if (from === -1) return null;
  const others = visibleIds.filter((id) => id !== movedId);
  const without = storedIds.filter((id) => id !== movedId);
  let to: number;
  if (dropIndex < others.length) {
    to = without.indexOf(others[dropIndex]);
  } else {
    const last = others[others.length - 1];
    to = last === undefined ? 0 : without.indexOf(last) + 1;
  }
  if (to < 0) return null;
  return { from, to };
}

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
