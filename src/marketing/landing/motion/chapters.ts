// Centium landing v29: the chapter marks ("01 · Your day" and so on, any
// [data-chm] on the page), the prototype's `chapters(y)`. As a mark comes
// into view the number rolls up out of its clip (data-chn, 105% to 0) and the
// title fades in (data-cht), over the 32% of the viewport after the mark's
// top passes 90% of the screen; the section heading next to it (the first h2
// or h1 in the mark's parent) fades from .15 and rises 22px, 4% of the
// viewport later. Reduced motion: each flips once half way.

import { clamp, eo } from "../engine/math";
import type { EngineCtx, EngineSection } from "../engine/scrollEngine";

interface Mark {
  t: number;
  num: HTMLElement | null;
  tit: HTMLElement | null;
  h2: HTMLElement | null;
}

export class ChapterMarks implements EngineSection {
  private marks: Mark[] = [];
  private rm: boolean;

  constructor(rm: boolean) {
    this.rm = rm;
  }

  measure() {
    this.marks = Array.from(document.querySelectorAll<HTMLElement>("[data-chm]")).map((el) => ({
      t: el.getBoundingClientRect().top + window.scrollY,
      num: el.querySelector<HTMLElement>("[data-chn]"),
      tit: el.querySelector<HTMLElement>("[data-cht]"),
      h2: el.parentElement ? el.parentElement.querySelector<HTMLElement>("h2,h1") : null,
    }));
  }

  scroll(y: number, ctx: EngineCtx) {
    const vh = window.innerHeight || ctx.vh,
      rm = this.rm;
    for (const c of this.marks) {
      const u = eo(clamp((y + vh * 0.9 - c.t) / (vh * 0.32)));
      const v = rm ? (u > 0.5 ? 1 : 0) : u;
      if (c.num) c.num.style.transform = "translateY(" + ((1 - v) * 105).toFixed(2) + "%)";
      if (c.tit) c.tit.style.opacity = v.toFixed(3);
      if (c.h2) {
        const w = rm ? v : eo(clamp((y + vh * 0.86 - c.t) / (vh * 0.32)));
        c.h2.style.opacity = (0.15 + 0.85 * w).toFixed(3);
        c.h2.style.transform = rm ? "none" : "translateY(" + ((1 - w) * 22).toFixed(2) + "px)";
      }
    }
  }

  destroy() {
    this.marks = [];
  }
}
