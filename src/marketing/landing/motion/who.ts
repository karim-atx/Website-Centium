// Centium landing v29: section 05's motion (WH1 v6), the prototype's
// `whoScroll`: each card's figure builds while the card's top rises from 75%
// of the viewport until its middle reaches the centre ((y + .75vh - top) /
// (.25vh + h/2)). Reduced motion: each element jumps to its end half way.
//
// Mobile dots: the markup gives them a transform/background transition and
// an active first dot, but the prototype never updates them; here they follow
// the swipe row (the card nearest the left edge is active), with the
// markup's two states (active #775FD7 at full width, others
// rgba(34,30,26,.18) at scaleX(.4)).

import { clamp } from "../engine/math";
import type { EngineCtx, EngineSection } from "../engine/scrollEngine";
import { anim, collect, type AnimItem } from "./anim";

interface Card {
  el: HTMLElement;
  t: number;
  h: number;
  A: AnimItem[];
}

export class WhoMotion implements EngineSection {
  private cards: Card[] = [];
  private row: HTMLElement | null = null;
  private dots: HTMLElement[] = [];
  private vh = 0;
  private rm: boolean;
  private onRow = () => this.syncDots();

  constructor(rm: boolean) {
    this.rm = rm;
  }

  measure(ctx: EngineCtx) {
    this.vh = ctx.vh;
    this.cards = Array.from(document.querySelectorAll<HTMLElement>("[data-inst]")).map((el) => ({
      el,
      t: el.getBoundingClientRect().top + window.scrollY,
      h: el.offsetHeight,
      A: collect(el),
    }));
    this.dots = Array.from(document.querySelectorAll<HTMLElement>("[data-whodot]"));
    const row = document.getElementById("who-cards");
    if (row !== this.row) {
      this.row?.removeEventListener("scroll", this.onRow);
      row?.addEventListener("scroll", this.onRow, { passive: true });
      this.row = row;
    }
    this.syncDots();
  }

  scroll(y: number) {
    const vh = this.vh;
    for (const it of this.cards) anim(it.A, clamp((y + vh * 0.75 - it.t) / (vh * 0.25 + it.h / 2)), this.rm);
  }

  private syncDots() {
    const row = this.row,
      c = this.cards;
    if (!row || c.length < 2 || !this.dots.length) return;
    const stride = c[1].el.offsetLeft - c[0].el.offsetLeft || 1,
      room = row.scrollWidth - row.clientWidth,
      end = room > 2 && row.scrollLeft >= room - 2,
      act = end ? this.dots.length - 1 : Math.max(0, Math.min(this.dots.length - 1, Math.round(row.scrollLeft / stride)));
    this.dots.forEach((d, j) => {
      d.style.background = j === act ? "#775FD7" : "rgba(34,30,26,.18)";
      d.style.transform = j === act ? "none" : "scaleX(.4)";
    });
  }

  destroy() {
    this.row?.removeEventListener("scroll", this.onRow);
    this.row = null;
    this.cards = [];
  }
}
