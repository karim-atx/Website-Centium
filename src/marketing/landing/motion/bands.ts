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
// Round 7 (F6, handoff-landing-fix SPEC F6): the dividers never disappear.
// - Live positions: every frame reads each canvas's rect against
//   innerHeight. The page offset this used to cache in measure() (resize only)
//   went stale whenever content above a band grew (fonts, the Arabic font,
//   images, the phone fits), and an on-screen band was cleared with Tio hidden.
// - Every visible frame checks the drawing surface: missing, 2px off its CSS
//   size x min(2, devicePixelRatio), or a lost context are rebuilt before
//   drawing. A band more than 2 screens above or 3 below is released (0 x 0)
//   and rebuilt by the same check when it comes back.
// - Tab, back/forward cache, rotation and browser-bar changes re-measure and
//   redraw 60 ms and 400 ms later.
// - Still fallback: while a band's centre is within 20 to 80% of the screen,
//   one pixel row through the canvas middle is sampled (every 700 ms, and on
//   scroll at most every 350 ms); two blank samples in a row show the band's
//   still image with Tio (Band.tsx [data-band-still], WebP then PNG, loaded
//   only then), and a drawn sample hides it again.

import { clamp } from "../engine/math";
import type { EngineCtx, EngineSection } from "../engine/scrollEngine";
import type { Band } from "../lines/bands";
import { pickBands } from "../lines/pickBands";
import { dirSign, SM } from "../engine/env";
import { Tio } from "./tio";
import type { TioKind } from "../tioLayers";

type BandsModule = typeof import("../lines/bands");

// Vite URLs, never inlined: a still is only requested when its band fails.
const STILLS = import.meta.glob("../assets/dividers/*.{webp,png}", { eager: true, query: "?no-inline", import: "default" }) as Record<string, string>;
const stillUrl = (name: string, ext: "webp" | "png") => STILLS["../assets/dividers/" + name + "." + ext];

interface Slot {
  cv: HTMLCanvasElement;
  b: Band;
  on: boolean;
  tio: Tio | null;
  onLost: () => void;
}

export class BandsMotion implements EngineSection {
  private pick = pickBands();
  private mod: BandsModule | null = null;
  private loading = false;
  private failed = false;
  private slots: Slot[] = [];
  private rm: boolean;
  private low: boolean;
  private onReady: () => void;
  private timers: number[] = [];
  private cleanups: (() => void)[] = [];
  private lastWatch = 0;

  /** onReady: the line engine has arrived, or the page changed under the
   *  bands (the page should measure again). */
  constructor(rm: boolean, low: boolean, onReady: () => void) {
    this.rm = rm;
    this.low = low;
    this.onReady = onReady;
    const refresh = () => {
      this.timers.forEach((id) => window.clearTimeout(id));
      this.timers = [window.setTimeout(this.onReady, 60), window.setTimeout(this.onReady, 400)];
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onScroll = () => {
      if (Date.now() - this.lastWatch >= 350) this.watch();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("orientationchange", refresh);
    window.visualViewport?.addEventListener("resize", refresh);
    window.addEventListener("scroll", onScroll, { passive: true });
    const every = window.setInterval(() => this.watch(), 700);
    this.cleanups.push(() => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("orientationchange", refresh);
      window.visualViewport?.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", onScroll);
      window.clearInterval(every);
      this.timers.forEach((id) => window.clearTimeout(id));
    });
  }

  measure() {
    const cvs = Array.from(document.querySelectorAll<HTMLCanvasElement>("canvas[data-band]"));
    if (!cvs.length) {
      this.drop(this.slots);
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
            /* the bands are decoration; the stills stand in */
            this.failed = true;
          });
      }
      return;
    }
    const Band = this.mod.Band,
      prev = this.slots;
    const next = cvs
      .map((cv, bi): Slot | null => {
        if (!cv.getContext || !cv.getContext("2d")) return null;
        const dom = this.pick.dom[bi];
        const old = prev.find((s) => s.cv === cv);
        if (old && old.b.o.dom === dom) {
          old.b.resize();
          old.tio?.measure(window.innerWidth);
          return old;
        }
        if (old) this.drop([old]);
        const tioEl = cv.parentElement?.querySelector<HTMLElement>("[data-tio]"),
          tio = tioEl ? (old?.tio ?? new Tio(tioEl, tioEl.getAttribute("data-tio") as TioKind, this.rm, dirSign() < 0)) : null;
        tio?.measure(window.innerWidth);
        const b = new Band(cv, { dom, seed: this.pick.seed[bi], n: window.innerWidth >= 1024 ? 30 : 24, q: this.low ? "low" : "high", rm: this.rm, hooks: tio ?? undefined });
        const slot: Slot = {
          cv,
          b,
          on: false,
          tio,
          onLost: () => {
            b.context();
            b.resize();
            slot.on = false;
          },
        };
        cv.addEventListener("contextlost", slot.onLost);
        cv.addEventListener("contextrestored", slot.onLost);
        return slot;
      })
      .filter((s): s is Slot => !!s);
    this.drop(prev.filter((s) => !next.includes(s)));
    this.slots = next;
  }

  tick(t: number, ctx: EngineCtx) {
    const vh = window.innerHeight || ctx.vh,
      k = this.low ? 1 : Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    for (const s of this.slots) {
      const r = s.cv.getBoundingClientRect();
      const p = this.rm ? 1 : clamp((vh * 0.95 - r.top) / (vh * 0.6));
      if (s.tio) {
        // Tio's box is the canvas less 120px at each end.
        const bt = r.top + 120,
          bh = r.height - 240;
        s.tio.update(clamp((vh - bt) / (vh + bh)), bt < vh * 2.2 && bt + bh > -vh * 1.2);
      }
      if (r.bottom < -2 * vh || r.top > 3 * vh) {
        if (s.cv.width || s.cv.height) {
          s.cv.width = 0;
          s.cv.height = 0;
        }
        s.on = false;
        continue;
      }
      if (!(r.bottom > -20 && r.top < vh + 20)) {
        if (s.on) {
          s.b.draw(0, t);
          s.on = false;
        }
        continue;
      }
      if (!s.cv.width || !s.cv.height || Math.abs(s.cv.width - Math.round(r.width * k)) > 2 || Math.abs(s.cv.height - Math.round(r.height * k)) > 2 || s.b.lost()) {
        s.b.context();
        s.b.resize();
      }
      s.on = true;
      s.b.draw(p, t);
    }
  }

  /** The still fallback's check (see the header). A band with no 2D context,
   *  or whose line engine failed to load, has no slot and counts as blank. */
  private watch() {
    this.lastWatch = Date.now();
    if (!this.mod && !this.failed) return;
    const vh = window.innerHeight;
    document.querySelectorAll<HTMLCanvasElement>("canvas[data-band]").forEach((cv) => {
      const s = this.slots.find((x) => x.cv === cv) ?? null,
        st = this.state(cv),
        r = cv.getBoundingClientRect(),
        mid = (r.top + r.bottom) / 2;
      if (!(mid > vh * 0.2 && mid < vh * 0.8)) {
        st.blank = 0;
        return;
      }
      let blank = !s || !cv.width || !cv.height || s.b.lost();
      if (!blank) {
        try {
          const c = cv.getContext("2d");
          if (!c) blank = true;
          else {
            const d = c.getImageData(0, Math.round(cv.height / 2), cv.width, 1).data;
            let m = 0;
            for (let i = 3; i < d.length; i += 16) m = Math.max(m, d[i]);
            blank = m === 0;
          }
        } catch {
          blank = false;
        }
      }
      st.blank = blank ? st.blank + 1 : 0;
      if (st.blank >= 2) this.still(cv, st, true);
      else if (!blank && st.still) this.still(cv, st, false);
    });
  }

  private states = new WeakMap<HTMLCanvasElement, { blank: number; still: boolean }>();
  private state(cv: HTMLCanvasElement) {
    let st = this.states.get(cv);
    if (!st) this.states.set(cv, (st = { blank: 0, still: false }));
    return st;
  }

  private still(cv: HTMLCanvasElement, st: { still: boolean }, on: boolean) {
    const img = cv.parentElement?.querySelector<HTMLImageElement>("img[data-band-still]");
    if (!img) return;
    if (on) {
      const name = img.getAttribute("data-band-still") + "-" + (window.innerWidth >= SM ? "desktop" : "phone"),
        webp = stillUrl(name, "webp"),
        png = stillUrl(name, "png");
      if (img.getAttribute("data-src") !== name && webp) {
        img.setAttribute("data-src", name);
        img.onerror = () => {
          if (png && img.src !== new URL(png, window.location.href).href) img.src = png;
        };
        img.src = webp;
      }
    }
    st.still = on;
    img.style.opacity = on ? "1" : "0";
    cv.style.visibility = on ? "hidden" : "";
    const tioEl = cv.parentElement?.querySelector<HTMLElement>("[data-tio]");
    if (tioEl) tioEl.style.visibility = on ? "hidden" : "";
  }

  private drop(slots: Slot[]) {
    slots.forEach((s) => {
      s.cv.removeEventListener("contextlost", s.onLost);
      s.cv.removeEventListener("contextrestored", s.onLost);
      s.b.dispose();
    });
  }

  destroy() {
    this.drop(this.slots);
    this.slots = [];
    this.cleanups.forEach((f) => f());
    this.cleanups = [];
  }
}
