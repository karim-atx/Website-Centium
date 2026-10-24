// Centium landing v29: section 04's motion (CO1 v6), the prototype's
// `coScroll`. Progress p (desktop: through the pinned 320vh track; mobile:
// from 70% of a screen before the track over 90% of a screen) times
// (messages + 1) gives st. Message i fades in and rises 10px over st i..i+1;
// the call card comes last. The six side scenes (client view left, coach view
// right) each own one step k = floor(st): scene j fades in over j-.05..j+.15
// and out over j+.9..j+1.05 (the first is shown from the start, the last
// stays), rising 10px, and builds over (st - j) / .8. The "k / 6" counters
// follow. Reduced motion: each message and scene flips at its half step.

import { clamp, prog, sm, type Track } from "../engine/math";
import type { EngineCtx, EngineSection } from "../engine/scrollEngine";
import { anim, collect, type AnimItem } from "./anim";

interface Scene {
  el: HTMLElement;
  A: AnimItem[];
}

export class CoachingMotion implements EngineSection {
  private track: Track | null = null;
  private cm: HTMLElement[] = [];
  private call: HTMLElement | null = null;
  private cl: Scene[] = [];
  private cr: Scene[] = [];
  private lstep: HTMLElement | null = null;
  private rstep: HTMLElement | null = null;
  private lg = true;
  private rm: boolean;

  constructor(rm: boolean) {
    this.rm = rm;
  }

  measure(ctx: EngineCtx) {
    this.lg = ctx.lg;
    const el = document.getElementById("co-track");
    this.track = el ? { el, t: el.getBoundingClientRect().top + window.scrollY, span: Math.max(1, el.offsetHeight - ctx.vh) } : null;
    const scenes = (sel: string) => Array.from(document.querySelectorAll<HTMLElement>(sel)).map((s) => ({ el: s, A: collect(s) }));
    this.cm = Array.from(document.querySelectorAll<HTMLElement>("[data-cm]"));
    this.call = document.querySelector<HTMLElement>("[data-call]");
    this.cl = scenes("[data-cl]");
    this.cr = scenes("[data-cr]");
    this.lstep = document.getElementById("co-lstep");
    this.rstep = document.getElementById("co-rstep");
  }

  scroll(y: number, ctx: EngineCtx) {
    if (!this.cm.length) return;
    const rm = this.rm,
      n = this.cm.length;
    const p = this.lg ? prog(this.track, y) : rm ? 1 : clamp((y + ctx.vh * 0.7 - (this.track ? this.track.t : 0)) / (ctx.vh * 0.9));
    const st = p * (n + 1);
    this.cm.forEach((m, i) => {
      const u = rm ? (st > i + 0.5 ? 1 : 0) : clamp(st - i);
      m.style.opacity = u.toFixed(3);
      m.style.transform = "translateY(" + ((1 - u) * 10).toFixed(1) + "px)";
    });
    if (this.call) this.call.style.opacity = (rm ? (st > n + 0.5 ? 1 : 0) : clamp(st - n)).toFixed(3);
    const k = Math.max(0, Math.min(5, Math.floor(st)));
    [this.cl, this.cr].forEach((list) =>
      list.forEach((sc, j) => {
        const vis = j === 0 ? 1 - sm(0.9, 1.05, st) : j === 5 ? sm(4.95, 5.15, st) : sm(j - 0.05, j + 0.15, st) * (1 - sm(j + 0.9, j + 1.05, st));
        const o = rm ? (j === k ? 1 : 0) : vis;
        sc.el.style.opacity = o.toFixed(3);
        sc.el.style.transform = rm ? "none" : "translateY(" + ((1 - o) * 10).toFixed(1) + "px)";
        anim(sc.A, clamp((st - j) / 0.8), rm);
      }),
    );
    if (this.lstep) this.lstep.textContent = k + 1 + " / 6";
    if (this.rstep) this.rstep.textContent = k + 1 + " / 6";
  }

  destroy() {
    this.cm = [];
    this.cl = [];
    this.cr = [];
  }
}
