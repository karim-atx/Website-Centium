// Centium landing v29: the scroll engine, the prototype's architecture
// (handover 03_motion/02-scroll-architecture.md: initScroll, loop, onScroll,
// measure) as a small registry.
//
// - ONE passive scroll listener and ONE requestAnimationFrame loop. Each
//   frame the loop runs every section's scroll pass when scrollY changed (or
//   something asked for a pass), then every section's time tick (line flow).
// - Measurements (getBoundingClientRect, offsetHeight, ...) happen only in
//   measure(): on start, when the fonts are ready and when the page asks
//   (viewport resize), never inside the scroll pass.
// - Every story state is a pure function of scroll progress; sections write
//   transforms and opacity only (plus canvases).
// - Reduced motion: no loop. A scroll schedules one frame that runs the
//   scroll pass and then one still redraw of the ticks (prototype `redraw`).
// - Low quality: the loop runs at 25 fps (setTimeout 40 ms), as the prototype.

import { LG } from "./env";
import { landingState } from "../state";

export interface EngineCtx {
  rm: boolean;
  low: boolean;
  /** Viewport, read in measure(). */
  vw: number;
  vh: number;
  lg: boolean;
  /** Seconds since the engine started (the prototype's loop clock). */
  t0: number;
}

export interface EngineSection {
  /** Read layout. Runs on start, on fonts ready and on every engine.measure(). */
  measure?(ctx: EngineCtx): void;
  /** Apply the state for scroll position y. Pure function of y; writes only. */
  scroll?(y: number, ctx: EngineCtx): void;
  /** Time-based drawing (line flow), t in seconds; 0 for the reduced-motion still. */
  tick?(t: number, ctx: EngineCtx): void;
  destroy?(): void;
}

export class ScrollEngine {
  private sections: EngineSection[] = [];
  private ctx: EngineCtx;
  private dead = false;
  private dirty = true;
  private lastY = NaN;
  private raf = 0;
  private timer = 0;
  private cleanups: (() => void)[] = [];

  constructor(opts: { rm: boolean; low: boolean }) {
    const vw = window.innerWidth,
      vh = window.innerHeight;
    this.ctx = { rm: opts.rm, low: opts.low, vw, vh, lg: vw >= LG, t0: performance.now() };
  }

  get context(): EngineCtx {
    return this.ctx;
  }

  add(section: EngineSection): () => void {
    this.sections.push(section);
    if (!this.dead) {
      section.measure?.(this.ctx);
      this.dirty = true;
      if (this.ctx.rm) this.schedule();
    }
    return () => {
      this.sections = this.sections.filter((s) => s !== section);
      section.destroy?.();
    };
  }

  /** Re-read layout (prototype `measure`), then run a scroll pass. */
  measure() {
    if (this.dead) return;
    const vw = window.innerWidth,
      vh = window.innerHeight;
    this.ctx.vw = vw;
    this.ctx.vh = vh;
    this.ctx.lg = vw >= LG;
    for (const s of this.sections) s.measure?.(this.ctx);
    this.runScroll();
    if (this.ctx.rm) this.redraw();
  }

  /** Ask for a scroll pass on the next frame (or now, in reduced motion). */
  invalidate() {
    this.dirty = true;
    if (this.ctx.rm) this.schedule();
  }

  start() {
    const onScroll = () => {
      if (!this.ctx.rm) {
        this.dirty = true;
        return;
      }
      this.schedule();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    this.cleanups.push(() => window.removeEventListener("scroll", onScroll));
    if (document.fonts) document.fonts.ready.then(() => this.measure());
    this.cleanups.push(landingState.subscribe(() => this.invalidate()));
    this.measure();
    if (!this.ctx.rm) this.loop();
  }

  stop() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    window.clearTimeout(this.timer);
    this.cleanups.forEach((f) => f());
    this.cleanups = [];
    for (const s of this.sections) s.destroy?.();
    this.sections = [];
  }

  private schedule() {
    if (this.raf || this.dead) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.runScroll();
      this.redraw();
    });
  }

  private runScroll() {
    if (this.dead) return;
    const y = window.scrollY;
    this.lastY = y;
    this.dirty = false;
    for (const s of this.sections) s.scroll?.(y, this.ctx);
  }

  private redraw() {
    for (const s of this.sections) s.tick?.(0, this.ctx);
  }

  private loop() {
    const frame = () => {
      if (this.dead) return;
      const t = (performance.now() - this.ctx.t0) / 1000;
      if (!document.hidden) {
        const y = window.scrollY;
        if (y !== this.lastY || this.dirty) this.runScroll();
        for (const s of this.sections) s.tick?.(t, this.ctx);
      }
      if (this.ctx.low) this.timer = window.setTimeout(frame, 40);
      else this.raf = requestAnimationFrame(frame);
    };
    frame();
  }
}
