// Centium landing v29: section 02's strike-through (PR1 v6), the prototype's
// `probScroll`, `probDrain`, `applyProb` and `sheen`. The target is the
// number of rows whose top is above 95% of the viewport; the struck count
// walks towards it one row every 210 ms (both ways), so a fast scroll still
// strikes the rows in order. A struck row swaps its ink for the faint copy
// and draws its 2px line (CSS transitions .7s / .5s in the markup). With all
// five struck the solution bar rises (.6s) and, once per arrival, a teal wipe,
// a gloss and a ring pulse cross it (1.5 s / 1.35 s / 1.9 s, Web Animations).
// Reduced motion: everything struck, the bar shown, no sheen.

import type { EngineCtx, EngineSection } from "../engine/scrollEngine";

interface Row {
  el: HTMLElement;
  ink: HTMLElement | null;
  faint: HTMLElement | null;
  strike: HTMLElement | null;
  /** Page position of the row, read in measure() (B4 QA: no layout reads in the scroll pass). */
  top: number;
}

export class ProblemMotion implements EngineSection {
  private rows: Row[] = [];
  private bar: HTMLElement | null = null;
  private struck: number | null = null;
  private target = 0;
  private timer = 0;
  private sheenDone = false;
  private dead = false;
  private rm: boolean;

  constructor(rm: boolean) {
    this.rm = rm;
  }

  measure() {
    this.rows = Array.from(document.querySelectorAll<HTMLElement>("[data-prow]")).map((el) => ({
      el,
      ink: el.querySelector<HTMLElement>("[data-pink]"),
      faint: el.querySelector<HTMLElement>("[data-pfaint]"),
      strike: el.querySelector<HTMLElement>("[data-pstrike]"),
      top: el.getBoundingClientRect().top + window.scrollY,
    }));
    this.bar = document.getElementById("prob-bar-wrap");
  }

  scroll(y: number, ctx: EngineCtx) {
    if (!this.rows.length) return;
    const n = this.rows.length;
    let target = 0;
    if (this.rm) target = n;
    else
      this.rows.forEach((r, i) => {
        if (r.top - y < ctx.vh * 0.95) target = i + 1;
      });
    this.target = target;
    if (this.struck == null) this.struck = 0;
    if (this.rm) {
      this.struck = target;
      this.apply(true);
      return;
    }
    if (!this.timer && this.struck !== target) this.drain();
  }

  private drain() {
    this.timer = 0;
    if (this.dead || this.struck == null || this.struck === this.target) return;
    this.struck += this.target > this.struck ? 1 : -1;
    this.apply(false);
    if (this.struck !== this.target) this.timer = window.setTimeout(() => this.drain(), 210);
  }

  private apply(quiet: boolean) {
    const n = this.rows.length,
      k = this.struck ?? 0;
    this.rows.forEach((r, i) => {
      const on = k > i;
      if (r.strike) r.strike.style.transform = on ? "scaleX(1)" : "scaleX(0)";
      if (r.ink) r.ink.style.opacity = on ? "0" : "1";
      if (r.faint) r.faint.style.opacity = on ? "1" : "0";
    });
    const all = k >= n;
    if (this.bar) {
      this.bar.style.opacity = all ? "1" : "0";
      this.bar.style.transform = all ? "none" : "translateY(14px) scale(.98)";
    }
    if (all && !this.sheenDone && !quiet && !this.rm) this.sheen();
    if (!all) this.sheenDone = false;
  }

  private sheen() {
    this.sheenDone = true;
    const ring = document.getElementById("prob-ring"),
      wipe = document.getElementById("prob-wipe"),
      gloss = document.getElementById("prob-gloss");
    if (!wipe || !wipe.animate || !ring || !gloss) return;
    const a1 = wipe.animate(
      [
        { opacity: 0, transform: "translateY(-100%) skewY(-3deg)" },
        { opacity: 1, offset: 0.18 },
        { opacity: 1, offset: 0.82 },
        { opacity: 0, transform: "translateY(100%) skewY(-3deg)" },
      ],
      { duration: 1500, delay: 100, easing: "cubic-bezier(.4,0,.3,1)", fill: "both" },
    );
    const a2 = gloss.animate(
      [
        { opacity: 0, transform: "translate3d(-120%,0,0) skewX(-18deg)" },
        { opacity: 0.9, offset: 0.22 },
        { opacity: 0.55, offset: 0.7 },
        { opacity: 0, transform: "translate3d(220%,0,0) skewX(-18deg)" },
      ],
      { duration: 1350, delay: 220, easing: "cubic-bezier(.32,0,.24,1)", fill: "both" },
    );
    const a3 = ring.animate(
      [
        { opacity: 0, transform: "scale(.985)" },
        { opacity: 0.34, transform: "scale(1)", offset: 0.22 },
        { opacity: 0, transform: "scale(.985)", offset: 0.52 },
        { opacity: 0.26, transform: "scale(.995)", offset: 0.74 },
        { opacity: 0, transform: "scale(.985)" },
      ],
      { duration: 1900, delay: 100, easing: "ease-out", fill: "both" },
    );
    window.setTimeout(() => [a1, a2, a3].forEach((a) => a.cancel()), 2200);
  }

  destroy() {
    this.dead = true;
    window.clearTimeout(this.timer);
    this.rows = [];
  }
}
