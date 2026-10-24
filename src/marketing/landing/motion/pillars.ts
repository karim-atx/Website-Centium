// Centium landing v29: section 03's motion (PI1 v6), the prototype's
// `plScroll` (03_motion/06-pillars.md).
// Desktop: progress through the pinned 650vh track times 5 gives s; pillar
// idx = floor(s) is lit in the index (opacity 1, #FAF9FE) and its 3px bar
// fills over the first 75% of its step (the ones before stay full). Each pane
// is fully shown for its own step, cross-fading over .06 of a step at either
// end (the first and last stay shown past the ends) with an 18px drift and a
// .98 to 1 scale; its widgets build over (s - i - .02) / .73.
// Mobile: the panes are a horizontal snap carousel; each builds while the
// carousel rises into view (95% to 50% of the viewport) and is at most 80%
// of a card away from the centre; the active dot widens.
// Reduced motion: no drift or scale, and each widget jumps to its end.

import { clamp, prog, type Track } from "../engine/math";
import type { EngineCtx, EngineSection } from "../engine/scrollEngine";
import { anim, collect, type AnimItem } from "./anim";

interface Pane {
  el: HTMLElement;
  A: AnimItem[];
}

export class PillarsMotion implements EngineSection {
  private track: Track | null = null;
  private pli: HTMLElement[] = [];
  private plf: HTMLElement[] = [];
  private panes: Pane[] = [];
  private car: HTMLElement | null = null;
  private dots: HTMLElement[] = [];
  private lg = true;
  private rm: boolean;
  private invalidate: () => void;
  private onCar = () => this.invalidate();
  debug: Record<string, number> = {};

  /** invalidate: ask the engine for a scroll pass (the carousel scrolled). */
  constructor(rm: boolean, invalidate: () => void) {
    this.rm = rm;
    this.invalidate = invalidate;
  }

  measure(ctx: EngineCtx) {
    this.lg = ctx.lg;
    const el = document.getElementById("pl-track");
    this.track = el ? { el, t: el.getBoundingClientRect().top + window.scrollY, span: Math.max(1, el.offsetHeight - ctx.vh) } : null;
    this.pli = Array.from(document.querySelectorAll<HTMLElement>("[data-pli]"));
    this.plf = Array.from(document.querySelectorAll<HTMLElement>("[data-plf]"));
    this.panes = Array.from(document.querySelectorAll<HTMLElement>("[data-pls]")).map((p) => ({ el: p, A: collect(p) }));
    this.dots = Array.from(document.querySelectorAll<HTMLElement>("[data-dot]"));
    const car = document.getElementById("pl-panes");
    if (car !== this.car) {
      this.car?.removeEventListener("scroll", this.onCar);
      car?.addEventListener("scroll", this.onCar, { passive: true });
      this.car = car;
    }
  }

  scroll(y: number, ctx: EngineCtx) {
    if (!this.panes.length) return;
    const rm = this.rm;
    if (this.lg) {
      const s = prog(this.track, y) * 5,
        idx = Math.max(0, Math.min(4, Math.floor(s))),
        fr = s - idx;
      this.pli.forEach((el, i) => {
        el.style.opacity = i === idx ? "1" : ".38";
        el.style.background = i === idx ? "#FAF9FE" : "transparent";
      });
      this.plf.forEach((el, i) => {
        el.style.transform = "scaleY(" + (i < idx ? 1 : i === idx ? Math.min(1, fr / 0.75) : 0).toFixed(3) + ")";
      });
      this.panes.forEach((p, i) => {
        const d = s - i;
        let w = clamp(Math.min((d + 0.06) / 0.06, (1 - d) / 0.06));
        if (i === 0 && d < 0.5) w = 1;
        if (i === 4 && d > 0.5) w = 1;
        p.el.style.opacity = w.toFixed(3);
        p.el.style.transform = rm ? "none" : "translateY(" + ((d - 0.5) * -18 * (1 - w)).toFixed(1) + "px) scale(" + (0.98 + 0.02 * w).toFixed(3) + ")";
        p.el.style.pointerEvents = w > 0.5 ? "auto" : "none";
        p.el.style.zIndex = w > 0.5 ? "2" : "1";
        anim(p.A, clamp((s - i - 0.02) / 0.73), rm);
      });
      this.debug = { s: +s.toFixed(3), idx, anim: +clamp((fr - 0.02) / 0.73).toFixed(3) };
    } else if (this.car) {
      const first = this.panes[0].el,
        cw = first.getBoundingClientRect().width + 14,
        a = this.car.scrollLeft / cw;
      const r = this.car.getBoundingClientRect(),
        u = rm ? 1 : clamp((ctx.vh * 0.95 - r.top) / (ctx.vh * 0.45 + r.height));
      this.panes.forEach((p, i) => {
        p.el.style.opacity = "1";
        p.el.style.transform = "none";
        // Not in the prototype: clear what the desktop pass left after a resize
        // from desktop to mobile (a pane it hid would stay untouchable).
        p.el.style.pointerEvents = "";
        p.el.style.zIndex = "";
        anim(p.A, Math.min(u, clamp((1 - Math.abs(a - i)) * 1.25)), rm);
      });
      const act = Math.round(a);
      this.dots.forEach((d, j) => {
        d.style.transform = "scaleX(" + (j === act ? 1 : 0.3) + ")";
        d.style.opacity = j === act ? "1" : ".6";
        d.style.background = j === act ? "#7D67D9" : "rgba(34,30,26,.18)";
      });
    }
  }

  destroy() {
    this.car?.removeEventListener("scroll", this.onCar);
    this.car = null;
    this.panes = [];
  }
}
