// Centium landing v29: the WK1 bands between chapters (every canvas
// [data-band] on the page), the prototype's measure() band block and
// `bandTick` (03_motion/09-bands.md). One draw per page load (pickBands)
// decides which band is teal- or lavender-dominant, neighbours alternating;
// 30 lines on desktop, 24 below 1024px. Each visible band draws itself from
// left to right as it rises from 95% to 35% of the viewport (p 0..1); an
// off-screen band is cleared once and then skipped. Reduced motion: drawn
// complete and still. The line engine (lines/bands.ts) is code-split and
// arrives on the first measure that finds a band.
// Landing update (C17): each band carries Tio (motion/tio.ts), hooked into its
// frame; every band, drawn or not, tells its Tio its pass up the screen and
// whether it is near, so his images load ahead of time (2.2 screens below,
// 1.2 above).

import { clamp } from "../engine/math";
import type { EngineCtx, EngineSection } from "../engine/scrollEngine";
import type { Band } from "../lines/bands";
import { pickBands } from "../lines/pickBands";
import { dirSign } from "../engine/env";
import { Tio } from "./tio";
import type { TioKind } from "../tioLayers";

type BandsModule = typeof import("../lines/bands");

interface Slot {
  cv: HTMLCanvasElement;
  b: Band;
  on: boolean;
  /** Page top and height of the canvas, read in measure() (B4 QA: the tick ran
   *  getBoundingClientRect on every band every frame, a forced layout). */
  top: number;
  h: number;
  tio: Tio | null;
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
          old.tio?.measure(window.innerWidth);
          return old;
        }
        const tioEl = cv.parentElement?.querySelector<HTMLElement>("[data-tio]"),
          tio = tioEl ? (old?.tio ?? new Tio(tioEl, tioEl.getAttribute("data-tio") as TioKind, this.rm, dirSign() < 0)) : null;
        tio?.measure(window.innerWidth);
        const b = new Band(cv, { dom, seed: this.pick.seed[bi], n: window.innerWidth >= 1024 ? 30 : 24, q: this.low ? "low" : "high", rm: this.rm, hooks: tio ?? undefined });
        return { cv, b, on: false, top, h: r.height, tio };
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
      if (s.tio) {
        // Tio's box is the canvas less 120px at each end.
        const bt = r.top + 120,
          bh = s.h - 240;
        s.tio.update(clamp((vh - bt) / (vh + bh)), bt < vh * 2.2 && bt + bh > -vh * 1.2);
      }
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
