// Centium landing v29: the chapter marks ("01 · Your day" and so on, any
// [data-chm] on the page), the prototype's `chapters(y)`. As a mark comes
// into view the number rolls up out of its clip (data-chn, 105% to 0) and the
// title fades in (data-cht), over the 32% of the viewport after the mark's
// top passes 90% of the screen; the section heading next to it (the first h2
// or h1 in the mark's parent) fades from .15 and rises 22px, 4% of the
// viewport later.
// Round 8 (F8, handoff-landing-fix SPEC F8): every scroll pass reads the
// mark's live page top (the mark, not the h2 that moves), never an offset
// cached in measure(): a measure at the bottom of the page (the browser bars
// coming back fire resize there) cached wrong offsets and left every title
// below faded. A mark React replaced is found again by its data-chm. Reduced
// motion: every mark is in its final state (ChapterMark renders it so).

import { clamp, eo } from "../engine/math";
import type { EngineCtx, EngineSection } from "../engine/scrollEngine";

interface Mark {
  el: HTMLElement;
  num: HTMLElement | null;
  tit: HTMLElement | null;
  h2: HTMLElement | null;
}

const parts = (el: HTMLElement): Mark => ({
  el,
  num: el.querySelector<HTMLElement>("[data-chn]"),
  tit: el.querySelector<HTMLElement>("[data-cht]"),
  h2: el.parentElement ? el.parentElement.querySelector<HTMLElement>("h2,h1") : null,
});

export class ChapterMarks implements EngineSection {
  private marks: Mark[] = [];
  private rm: boolean;

  constructor(rm: boolean) {
    this.rm = rm;
  }

  measure() {
    this.marks = Array.from(document.querySelectorAll<HTMLElement>("[data-chm]")).map(parts);
  }

  scroll(y: number, ctx: EngineCtx) {
    const vh = window.innerHeight || ctx.vh,
      rm = this.rm;
    for (let i = 0; i < this.marks.length; i++) {
      let c = this.marks[i];
      if (!c.el.isConnected) {
        const id = c.el.getAttribute("data-chm"),
          el = id == null ? null : document.querySelector<HTMLElement>('[data-chm="' + id + '"]');
        if (!el) continue;
        c = this.marks[i] = parts(el);
      }
      const top = rm ? 0 : c.el.getBoundingClientRect().top + y;
      const v = rm ? 1 : eo(clamp((y + vh * 0.9 - top) / (vh * 0.32)));
      if (c.num) c.num.style.transform = "translateY(" + ((1 - v) * 105).toFixed(2) + "%)";
      if (c.tit) c.tit.style.opacity = v.toFixed(3);
      if (c.h2) {
        const w = rm ? 1 : eo(clamp((y + vh * 0.86 - top) / (vh * 0.32)));
        c.h2.style.opacity = (0.15 + 0.85 * w).toFixed(3);
        c.h2.style.transform = rm ? "none" : "translateY(" + ((1 - w) * 22).toFixed(2) + "px)";
      }
    }
  }

  destroy() {
    this.marks = [];
  }
}
