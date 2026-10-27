// Centium landing v29: section 07's reviews row (prototype `applyReviews` and
// the rv loop in initScroll). The row ([data-rvrow], direction -1) slides
// left at 22 px/s, wrapping every period (one copy of the list); hovering or
// focusing the row pauses it (rvPause / rvPlay). The step is clamped to 50 ms
// so a backgrounded tab never jumps. Reduced motion: no slide; the row stays
// at 0 and scrolls by hand (Reviews.tsx: overflow-x auto, side padding).
// Deviation from the prototype: the period is measured between the first
// card of two copies (the prototype divided scrollWidth by 3, 6px short of a
// period, so the loop stepped 6px at every wrap), and nothing is written
// while the row is off-screen.

import type { EngineCtx, EngineSection } from "../engine/scrollEngine";

export class ReviewsMotion implements EngineSection {
  /** Set while the pointer or focus is inside the row. */
  private paused = false;
  private rm: boolean;
  private row: HTMLElement | null = null;
  private period = 0;
  private top = 0;
  private height = 0;
  private off = 0;
  private last = -1;

  constructor(rm: boolean) {
    this.rm = rm;
  }

  /** The pointer or focus entered (true) or left (false) the row (prototype rvPause / rvPlay). */
  setPaused(p: boolean) {
    this.paused = p;
  }

  /** B4 QA (not in the prototype): a card that takes keyboard focus while the
   *  slide has it partly off-screen is brought in, 24px from the left edge, so
   *  its focus ring is visible. The row stays paused there until focus leaves. */
  reveal(card: EventTarget) {
    if (this.rm || !this.row || !this.period || !(card instanceof HTMLElement) || card.parentElement !== this.row) return;
    // From the slide offset, not the card's rect: off-screen the row's
    // transform is not written, so the rect can be stale.
    const left = (this.row.parentElement ?? this.row).getBoundingClientRect().left + card.offsetLeft - (this.off % this.period);
    if (left >= 0 && left + card.offsetWidth <= window.innerWidth) return;
    // The focusable cards are the first copy (offsetLeft 0 .. period), so no
    // wrap: the first card gives -24 (the row 24px right of its rest), which
    // tick() carries on from when the focus leaves.
    const m = card.offsetLeft - 24;
    this.off = m;
    this.row.style.transform = "translate3d(" + (-m).toFixed(1) + "px,0,0)";
  }

  measure() {
    const row = document.querySelector<HTMLElement>("[data-rvrow]");
    this.row = row;
    if (!row) return;
    const n = Number(row.getAttribute("data-n")) || 0;
    const cards = row.children;
    const a = cards[0] as HTMLElement | undefined,
      b = cards[n] as HTMLElement | undefined;
    this.period = a && b ? b.offsetLeft - a.offsetLeft : row.scrollWidth;
    const wrap = row.parentElement ?? row;
    const r = wrap.getBoundingClientRect();
    this.top = r.top + window.scrollY;
    this.height = r.height;
    if (this.rm) row.style.transform = "translate3d(0px,0,0)";
  }

  tick(t: number, ctx: EngineCtx) {
    if (this.rm || !this.row || !this.period) return;
    const dt = this.last < 0 ? 0 : Math.min(0.05, Math.max(0, t - this.last));
    this.last = t;
    if (!this.paused) this.off += dt * 22;
    const y = window.scrollY;
    if (this.top > y + ctx.vh || this.top + this.height < y) return;
    // dir -1: speed factor 0.85 + |dir| * 0.15 = 1, x = -m.
    const m = this.off % this.period;
    this.row.style.transform = "translate3d(" + (-m).toFixed(1) + "px,0,0)";
  }

  destroy() {
    this.row = null;
  }
}
