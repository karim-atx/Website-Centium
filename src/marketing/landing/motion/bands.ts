// Centium landing v29: the WK1 bands between chapters (every canvas
// [data-band] on the page), the prototype's measure() band block and
// `bandTick` (03_motion/09-bands.md). One draw per page load (pickBands)
// decides which band is teal- or lavender-dominant, neighbours alternating;
// 30 lines on desktop, 24 below 1024px. Each visible band draws itself from
// left to right as it rises from 95% to 35% of the viewport (p 0..1); an
// off-screen band is cleared once and then skipped. Reduced motion: drawn
// complete and still. The line engine (lines/bands.ts) is code-split and
// arrives on the first measure that finds a band.

import { clamp } from "../engine/math";
import type { EngineCtx, EngineSection } from "../engine/scrollEngine";
import type { Band } from "../lines/bands";
import { pickBands } from "../lines/pickBands";

type BandsModule = typeof import("../lines/bands");

interface Slot {
  cv: HTMLCanvasElement;
  b: Band;
  on: boolean;
  /** Page top and height of the canvas, read in measure() (B4 QA: the tick ran
   *  getBoundingClientRect on every band every frame, a forced layout). */
  top: number;
  h: number;
}

export class BandsMotion implements EngineSection {
  private pick = pickBands();
  private mod: BandsModule | null = null;
  private loading = false;
  private slots: Slot[] = [];
  private rm: boolean;
  private low: boolean;
  private onReady: () => void;

  /** onReady: the line engine has arrived (the page should measure again). */
  constructor(rm: boolean, low: boolean, onReady: () => void) {
    this.rm = rm;
    this.low = low;
    this.onReady = onReady;
  }

  measure() {
    const cvs = Array.from(document.querySelectorAll<HTMLCanvasElement>("canvas[data-band]"));
    if (!cvs.length) {
      this.slots = [];
      return;
    }
    if (!this.mod) {
      if (!this.loading) {
        this.loading = true;
        import("../lines/bands")
          .then((m) => {
            this.mod = m;
            this.onReady();
          })
          .catch(() => {
            /* the bands are decoration */
          });
      }
      return;
    }
    const Band = this.mod.Band,
      prev = this.slots;
    this.slots = cvs
      .map((cv, bi) => {
        if (!cv.getContext || !cv.getContext("2d")) return null;
        const dom = this.pick.dom[bi];
        const old = prev.find((s) => s.cv === cv);
        const r = cv.getBoundingClientRect(),
          top = r.top + window.scrollY;
        if (old && old.b.o.dom === dom) {
          old.b.resize();
          old.top = top;
          old.h = r.height;
          return old;
        }
        const b = new Band(cv, { dom, seed: this.pick.seed[bi], n: window.innerWidth >= 1024 ? 30 : 24, q: this.low ? "low" : "high", rm: this.rm });
        return { cv, b, on: false, top, h: r.height };
      })
      .filter((s): s is Slot => !!s);
  }

  tick(t: number, ctx: EngineCtx) {
    const vh = ctx.vh,
      y = window.scrollY;
    for (const s of this.slots) {
      const r = { top: s.top - y, bottom: s.top - y + s.h };
      const p = this.rm ? 1 : clamp((vh * 0.95 - r.top) / (vh * 0.6));
      const vis = r.bottom > -20 && r.top < vh + 20;
      if (!vis) {
        if (s.on) {
          s.b.draw(0, t);
          s.on = false;
        }
        continue;
      }
      s.on = true;
      s.b.draw(p, t);
    }
  }

  destroy() {
    this.slots = [];
  }
}
