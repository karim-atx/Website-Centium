// Centium landing v29: section 06's motion (EC1 v6), the prototype's
// `ecoIdx`, `ecoCur`, `ecoGo`, `ecoSnap`, `initEcoDrag`, `ecoScroll` and the
// mobile half of `fitEco` / `ecoRest` (03_motion/07-section05-06.md).
// Desktop: progress through the pinned 300vh track times 4 (plus a drag
// offset) is the slide index; each slide sits 74% of its width per step away
// from the centre, scaled down 14% per step (to 1.2 steps), fading to .45 one
// step away and hidden past 1.7; the centred one builds its graphic over
// 1 - |d| * 1.4. Arrows, keys and drag jump the scroll to a slide while the
// slides glide there (.5s transition). Mobile: the visible set is a snap
// carousel; every graphic of both sets is shown at its final drawn state and
// the desktop inline styles are cleared (so nothing disappears after a resize
// or a toggle), and a nowrap text that does not fit is allowed to wrap.
// The counter reads "0k / 05" and the progress bar fills k/5.

import { clamp, prog, type Track } from "../engine/math";
import type { EngineCtx, EngineSection } from "../engine/scrollEngine";
import { anim, collect, type AnimItem } from "./anim";

interface EcoSlide {
  el: HTMLElement;
  card: HTMLElement | null;
  A: AnimItem[];
}

export class EcoMotion implements EngineSection {
  private track: Track | null = null;
  private seg = 0;
  private set: HTMLElement | null = null;
  private slides: EcoSlide[] = [];
  private count: HTMLElement | null = null;
  private progEl: HTMLElement | null = null;
  private view: HTMLElement | null = null;
  private lg = true;
  private dragOff = 0;
  private snapT = 0;
  private fitT = 0;
  private x0: number | null = null;
  private base = 0;
  private rm: boolean;
  private invalidate: () => void;
  private onSet = () => this.invalidate();

  constructor(rm: boolean, invalidate: () => void) {
    this.rm = rm;
    this.invalidate = invalidate;
  }

  /** The audience toggle changed (Professionals 0, Businesses 1); the page re-measures next. */
  setSeg(seg: number) {
    this.seg = seg;
  }

  measure(ctx: EngineCtx) {
    this.lg = ctx.lg;
    const el = document.getElementById("eco-track");
    this.track = el ? { el, t: el.getBoundingClientRect().top + window.scrollY, span: Math.max(1, el.offsetHeight - ctx.vh) } : null;
    const set = document.querySelector<HTMLElement>('[data-eset="' + this.seg + '"]');
    if (set !== this.set) {
      this.set?.removeEventListener("scroll", this.onSet);
      set?.addEventListener("scroll", this.onSet, { passive: true });
      this.set = set;
    }
    this.slides = set
      ? Array.from(set.querySelectorAll<HTMLElement>("[data-sl]")).map((s) => ({ el: s, card: s.querySelector<HTMLElement>("[data-slc]"), A: collect(s) }))
      : [];
    this.count = document.getElementById("eco-count");
    this.progEl = document.getElementById("eco-prog");
    const view = document.getElementById("eco-view");
    if (view !== this.view) {
      this.unbindDrag();
      this.view = view;
      this.bindDrag();
    }
    window.clearTimeout(this.fitT);
    this.fitT = window.setTimeout(() => this.fitMobile(), 80);
  }

  /** Prototype ecoIdx: the slide index as a float. */
  private idx(y: number): number {
    if (this.lg) return prog(this.track, y) * 4 + this.dragOff;
    if (!this.set || !this.slides.length) return 0;
    const cw = this.slides[0].el.getBoundingClientRect().width + 14;
    return this.set.scrollLeft / cw;
  }

  /** Prototype ecoCur: the slide in the centre. */
  cur(): number {
    return Math.round(this.idx(window.scrollY));
  }

  /** Prototype ecoGo: bring slide i (0..4) to the centre. */
  go(i: number) {
    i = Math.max(0, Math.min(4, i));
    if (this.lg && this.track) {
      this.snap();
      window.scrollTo({ top: this.track.t + this.track.span * (i / 4), behavior: "auto" });
    } else if (this.set && this.slides.length) {
      const cw = this.slides[0].el.getBoundingClientRect().width + 14;
      this.set.scrollTo({ left: i * cw, behavior: this.rm ? "auto" : "smooth" });
    }
  }

  /** Prototype ecoSnap: the slides glide (.5s) to where a jump puts them. */
  private snap() {
    if (this.rm) return;
    const list = this.slides;
    list.forEach((s) => {
      s.el.style.transition = "transform .5s cubic-bezier(.22,1,.36,1),opacity .5s cubic-bezier(.22,1,.36,1)";
    });
    window.clearTimeout(this.snapT);
    this.snapT = window.setTimeout(() => list.forEach((s) => (s.el.style.transition = "")), 520);
  }

  // Prototype initEcoDrag: on desktop the carousel can be dragged sideways.
  private down = (e: PointerEvent) => {
    if (!this.lg || !this.view) return;
    this.x0 = e.clientX;
    this.base = this.idx(window.scrollY) - this.dragOff;
    this.view.setPointerCapture?.(e.pointerId);
    this.view.style.cursor = "grabbing";
  };
  private move = (e: PointerEvent) => {
    if (this.x0 == null) return;
    const w = (this.slides[0] ? this.slides[0].el.offsetWidth : 800) * 0.74;
    this.dragOff = Math.max(-this.base, Math.min(4 - this.base, -(e.clientX - this.x0) / w));
    this.scroll(window.scrollY);
  };
  private up = () => {
    if (this.x0 == null) return;
    this.x0 = null;
    if (this.view) this.view.style.cursor = "";
    const target = Math.round(this.base + this.dragOff);
    this.dragOff = 0;
    this.go(target);
    this.scroll(window.scrollY);
  };
  private bindDrag() {
    const v = this.view;
    if (!v) return;
    v.addEventListener("pointerdown", this.down);
    v.addEventListener("pointermove", this.move);
    v.addEventListener("pointerup", this.up);
    v.addEventListener("pointercancel", this.up);
  }
  private unbindDrag() {
    const v = this.view;
    if (!v) return;
    v.removeEventListener("pointerdown", this.down);
    v.removeEventListener("pointermove", this.move);
    v.removeEventListener("pointerup", this.up);
    v.removeEventListener("pointercancel", this.up);
  }

  /** Prototype ecoRest + the nowrap pass of fitEco (mobile only). The card
   *  height (432px, 400px under 380px) and the two-line clamp of the copy are
   *  in the markup (Ecosystem.tsx). */
  private fitMobile() {
    if (window.innerWidth >= 1024) return;
    document.querySelectorAll<HTMLElement>("[data-eset]").forEach((set) => {
      anim(collect(set), 1, this.rm);
      set.querySelectorAll<HTMLElement>("[data-sl]").forEach((el) => {
        el.style.transform = "";
        el.style.opacity = "";
        el.style.zIndex = "";
        el.style.pointerEvents = "";
        el.style.transition = "";
      });
      set.querySelectorAll<HTMLElement>("[data-slc]").forEach((c) => {
        c.style.opacity = "1";
        c.style.transform = "none";
      });
      set.querySelectorAll<HTMLElement>("[data-slc] *").forEach((e) => {
        if (e.children.length || getComputedStyle(e).whiteSpace !== "nowrap" || e.scrollWidth <= e.clientWidth + 1) return;
        e.style.whiteSpace = "normal";
        e.style.textOverflow = "clip";
        e.style.overflowWrap = "anywhere";
      });
    });
  }

  scroll(y: number) {
    if (!this.slides.length) return;
    const idx = this.idx(y),
      lg = this.lg;
    this.slides.forEach((s, i) => {
      const d = i - idx,
        ad = Math.abs(d);
      if (lg) {
        const w = s.el.offsetWidth;
        s.el.style.transform = "translateX(" + (d * w * 0.74).toFixed(1) + "px) scale(" + (1 - Math.min(1.2, ad) * 0.14).toFixed(4) + ")";
        s.el.style.opacity = (ad > 1.7 ? 0 : 1 - Math.min(1, ad) * 0.55).toFixed(3);
        s.el.style.zIndex = String(10 - Math.round(ad * 2));
        s.el.style.pointerEvents = ad < 0.5 ? "auto" : "none";
        anim(s.A, clamp(1 - ad * 1.4), this.rm);
      } else {
        s.el.style.transform = "";
        s.el.style.opacity = "";
        s.el.style.zIndex = "";
        s.el.style.pointerEvents = "";
        if (s.card) {
          s.card.style.transform = "none";
          s.card.style.opacity = "1";
        }
        anim(s.A, 1, this.rm);
      }
    });
    const k = Math.max(0, Math.min(4, Math.round(idx)));
    if (this.count) this.count.textContent = String(k + 1).padStart(2, "0") + " / 05";
    if (this.progEl) this.progEl.style.transform = "scaleX(" + ((k + 1) / 5).toFixed(3) + ")";
  }

  destroy() {
    window.clearTimeout(this.snapT);
    window.clearTimeout(this.fitT);
    this.set?.removeEventListener("scroll", this.onSet);
    this.unbindDrag();
    this.set = null;
    this.view = null;
    this.slides = [];
  }
}
