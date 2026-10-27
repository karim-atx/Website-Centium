// Centium landing v29: the reviews row's layout rules (section 07), pure so
// they can be unit-tested. The row is the review list repeated end to end and
// slid left forever (motion/reviews.ts); the prototype always rendered three
// copies, which leaves a gap at the end of the screen once the list is short
// (3 reviews) or the screen is wide. Here the number of copies is whatever
// keeps the screen covered at every point of the loop, and never under the
// prototype's three.

import type { Review } from "../../../content/reviews";

/** The gap between two cards (RV1 markup: gap 18px). */
export const RV_GAP = 18;

/** How many copies of the list the row needs. Reduced motion: one (the row
 *  scrolls by hand instead, prototype rvOver/rvPadX). Otherwise enough that,
 *  however far one copy has slid, the copies after it still reach past the
 *  right edge of a viewport vw wide. */
export function reviewCopies(count: number, cardW: number, vw: number, rm: boolean): number {
  if (rm || count < 1) return 1;
  const period = count * (cardW + RV_GAP);
  return Math.max(3, Math.ceil((vw + RV_GAP) / period) + 1);
}

/** True when, with `copies` copies, the row covers [0, vw] at every slide offset. */
export function rowCovers(count: number, cardW: number, vw: number, copies: number): boolean {
  const period = count * (cardW + RV_GAP);
  // At the worst offset one period has slid out on the left; what is left
  // must still reach the right edge (the last card ends a gap before the
  // row's end).
  return copies * period - RV_GAP - period >= vw;
}

export interface ReviewTone {
  bg: string;
  ink: string;
  star: string;
}

/** The badge and star colours, alternating lavender and teal (prototype data7 RV). */
export function reviewTone(i: number): ReviewTone {
  return i % 2 ? { bg: "#DAEAE7", ink: "#3D6E69", star: "#5D9C93" } : { bg: "#DED4F4", ink: "#5C48A8", star: "#9A7CF8" };
}

/** A rating clamped to whole stars 1 to 5. */
export function starCount(r: Review["rating"] | number): number {
  return Math.max(1, Math.min(5, Math.round(r)));
}
