// Landing update (WK1 v2 / v6, C17, centium/WK1-tio-dividers.md): Tio on the
// three wave dividers, drawn over each band's canvas by the band's own frame
// (lines/bands.ts BandHooks), so the lines and Tio move together.
// - Divider 1 (#wk-a): Tio surfs along the band's thickest line, from 8% to
//   92% of the width, never ahead of its drawn tip, tilting with the wave.
// - Divider 2 (#wk-m): Tio meditates at the centre while the lines part
//   around him.
// - Divider 3 (#wk-b): Tio pops up holding a bowl, the lines gather into its
//   mouth, and the bowl fills (apple, orange, banana, spinach, blueberries)
//   as the band passes up the screen.
// Everything is a pure function of q (the band's pass up the screen: 0 when
// its top meets the bottom of the screen, 1 when its bottom leaves the top)
// and p (its line-draw progress), so scrolling back reverses it exactly.
// Canvas space (W x H); the element's top is the canvas y - 120 (the canvas
// starts 120px above Tio's box). In Arabic the canvas is mirrored, so the
// line maths stays left to right and Tio's x is mirrored (W - x - width), his
// image flipped (except meditating, who is symmetric). Reduced motion:
// surfing at mid-wave, meditating still, the bowl up and full.
// Only transforms and opacity are written per frame. The images get their
// sources only when the band is within 2.2 screens below or 1.2 above.

import type { BandHooks, Pt } from "../lines/bands";
import { BOWL_LAYERS, type TioKind } from "../tioLayers";

// Vite URLs, never inlined (the bowl layers are under the inline limit), so
// no image reaches the page before its band is near.
const URLS = import.meta.glob("../assets/tio/**/*.{avif,webp,png}", { eager: true, query: "?no-inline", import: "default" }) as Record<string, string>;
const url = (name: string, ext: string) => URLS["../assets/tio/" + name + "." + ext];

const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const ss = (v: number) => {
  v = clamp(v);
  return v * v * (3 - 2 * v);
};

/** Image aspect (width / height of the 280px-tall exports) and, for the bowl, its mouth. */
const ASPECT: Record<TioKind, number> = { surf: 314 / 280, meditate: 248 / 280, bowl: 311 / 280 };
const SURF_BOARD = 0.93;
const BOWL_MX = 0.245,
  BOWL_MY = 0.7;
/** The food's arrival order (apple 0 .. blueberries 4) for each bowl layer; -1 always shown. */
const BOWL_ITEM: Record<(typeof BOWL_LAYERS)[number], number> = {
  base: -1,
  "spinach-back": 3,
  apple: 0,
  orange: 1,
  banana: 2,
  "spinach-front": 3,
  blueberries: 4,
  rim: -1,
};
const FILL_Q0 = 0.42,
  FILL_STEP = 0.096;

/** Tio's height by viewport width: 1024 and wider, 640 to 1023, below 640. */
export function tioHeight(kind: TioKind, vw: number): number {
  const lg = vw >= 1024,
    sm = vw >= 640;
  return { surf: lg ? 112 : sm ? 92 : 72, meditate: lg ? 104 : sm ? 86 : 66, bowl: lg ? 124 : sm ? 100 : 80 }[kind];
}

/** One bowl item's drop at its own progress t (0..1): offset (in Tio heights) and opacity. */
export function bowlItem(t: number): { dy: number; a: number; settle: number } {
  if (t >= 1) return { dy: 0, a: 1, settle: 0 };
  const a = ss(t / 0.35);
  if (t < 0.8) {
    const u = t / 0.8;
    return { dy: -(1 - (1 - Math.pow(1 - u, 3))) * 0.22, a, settle: 0 };
  }
  const k = (t - 0.8) / 0.2;
  return { dy: Math.sin(Math.PI * k) * 0.012, a, settle: Math.sin(Math.PI * k) };
}

/** How many of the five items are fully in the bowl at pass q (once the bowl is up). */
export function bowlFill(q: number, pop: number): number {
  let n = 0;
  for (let i = 0; i < 5; i++) if (pop >= 0.98 && clamp((q - (FILL_Q0 + i * FILL_STEP)) / FILL_STEP) >= 1) n++;
  return n;
}

export class Tio implements BandHooks {
  readonly kind: TioKind;
  private el: HTMLElement;
  private layers: { el: HTMLElement; i: number }[] = [];
  private rm: boolean;
  private rtl: boolean;
  private loaded = false;
  private w = 0;
  private h = 0;
  /** This frame's pass and whether the band is near (set by update()). */
  private q = 0;
  private on = false;
  // The rider line (surf), and the shapes the lines bend around.
  private rider: Pt[] | null = null;
  private riderW = 0;
  private cy = 0;
  private pop = 0;
  private bx = 0;
  private by = 0;
  /** Read by QA only (data attributes are not written per frame). */
  state = { x: 0, y: 0, rot: 0, op: 0, fill: 0 };

  constructor(el: HTMLElement, kind: TioKind, rm: boolean, rtl: boolean) {
    this.el = el;
    this.kind = kind;
    this.rm = rm;
    this.rtl = rtl;
    if (kind === "bowl")
      this.layers = Array.from(el.querySelectorAll<HTMLElement>("img[data-tio-img]")).map((img, j) => ({ el: img, i: BOWL_ITEM[BOWL_LAYERS[j]] ?? -1 }));
  }

  /** On resize: Tio's size for this viewport (layout, so not per frame). */
  measure(vw: number) {
    this.h = tioHeight(this.kind, vw);
    this.w = this.h * ASPECT[this.kind];
    this.el.style.width = this.w.toFixed(2) + "px";
    this.el.style.height = this.h + "px";
  }

  /** Each frame, before the band draws: its pass q and whether it is near. */
  update(q: number, near: boolean) {
    this.q = q;
    this.on = near && this.w > 0;
    if (near && !this.loaded) this.load();
  }

  private load() {
    this.loaded = true;
    this.el.querySelectorAll<HTMLImageElement>("img[data-tio-img]").forEach((img) => {
      const name = img.getAttribute("data-tio-img") ?? "";
      const pic = img.parentElement;
      pic?.querySelectorAll<HTMLSourceElement>("source[data-tio-src]").forEach((s) => {
        const u = url(name, s.getAttribute("data-tio-src") ?? "");
        if (u) s.srcset = u;
      });
      const png = url(name, "png");
      if (png) img.src = png;
    });
  }

  begin(W: number, H: number, p: number) {
    this.rider = null;
    this.riderW = 0;
    if (this.kind === "meditate") this.cy = H / 2;
    if (this.kind === "bowl") {
      const pop = this.rm ? 1 : ss((p - 0.2) / 0.55),
        x = W - this.w + (1 - pop) * (this.w * 1.05),
        y = H * 0.5 - 120 - this.h * 0.62 + (1 - pop) * 18;
      this.pop = pop;
      this.bx = x + this.w * BOWL_MX;
      this.by = y + 120 + this.h * BOWL_MY;
    }
  }

  warp(x: number, y: number, ly: number, lw: number, W: number, H: number): number {
    if (!this.on) return y;
    if (this.kind === "meditate") {
      // The lines part around him: above the middle pushed up, the rest down.
      const cx = W / 2,
        hw = this.w / 2 + 18,
        hh = this.h / 2 + 14,
        R = hw * 2.1,
        dx = Math.abs(x - cx);
      if (dx >= R) return y;
      const fall = 0.5 + 0.5 * Math.cos((Math.PI * dx) / R),
        lim = (hh + lw * 0.6 + 6) * fall;
      return ly < 0.5 ? Math.min(y, this.cy - lim) : Math.max(y, this.cy + lim);
    }
    if (this.kind === "bowl" && this.pop > 0.02) {
      // The lines gather into the bowl's mouth.
      const x0 = this.bx - W * 0.34;
      if (x <= x0) return y;
      const u = ss((x - x0) / (this.bx - x0)) * this.pop,
        spread = (ly - 0.5) * H * 0.06 * (1 - u);
      return y + (this.by + spread - y) * u;
    }
    return y;
  }

  line(lw: number, pts: Pt[]) {
    if (!this.on) return;
    if (this.kind === "surf" && lw > this.riderW) {
      this.riderW = lw;
      this.rider = pts;
    }
    if (this.kind === "bowl" && this.pop > 0.02) {
      // Each line ends at the mouth.
      for (let i = 0; i < pts.length; i++)
        if (pts[i][0] > this.bx) {
          pts.length = Math.max(2, i + 1);
          pts[pts.length - 1] = [this.bx, this.by];
          break;
        }
    }
  }

  end(W: number, H: number, p: number) {
    const w = this.w,
      h = this.h,
      rm = this.rm,
      q = this.q;
    let x = 0,
      y = 0,
      rot = 0,
      op = 1,
      sc = 1,
      flip = false;
    if (this.kind === "surf") {
      const qq = rm ? 0.5 : ss((q - 0.12) / 0.76);
      let xc = 0.08 * W + w / 2 + (W * 0.84 - w) * qq,
        yW = H * 0.5,
        slope = 0;
      const pts = this.rider;
      if (pts && pts.length > 2) {
        const head = pts[pts.length - 1][0];
        // Never ahead of the wave's drawn tip.
        if (!rm && head < xc + w * 0.15) xc = Math.max(0.08 * W + w / 2, head - w * 0.15);
        let j = 1;
        while (j < pts.length - 1 && pts[j][0] < xc) j++;
        const a = pts[j - 1],
          b = pts[j],
          u = b[0] === a[0] ? 0 : (xc - a[0]) / (b[0] - a[0]);
        yW = a[1] + (b[1] - a[1]) * u;
        slope = (b[1] - a[1]) / (b[0] - a[0] || 1);
        op = rm ? 1 : ss((head - 0.08 * W) / (w * 0.8));
      } else op = rm ? 1 : 0;
      rot = clamp((Math.atan(slope) * 180) / Math.PI, -22, 22);
      const bob = rm ? 0 : Math.sin(q * Math.PI * 8) * 3;
      x = xc - w / 2;
      y = yW - 120 - h * SURF_BOARD + bob - this.riderW * 0.25;
      if (this.rtl) {
        x = W - x - w;
        rot = -rot;
        flip = true;
      }
    } else if (this.kind === "meditate") {
      const fl = rm ? 0 : Math.sin(q * Math.PI * 3);
      x = W / 2 - w / 2;
      y = H / 2 - 120 - h / 2 + fl * 4;
      sc = 1 + fl * 0.012;
      op = rm ? 1 : ss(p / 0.35);
    } else {
      const pop = this.pop;
      x = W - w + (1 - pop) * (w * 1.05);
      y = H * 0.5 - 120 - h * 0.62 + (1 - pop) * 18;
      op = pop > 0.01 ? 1 : 0;
      // The food drops in one item at a time, only once the bowl is up.
      let bounce = 0;
      for (const L of this.layers) {
        if (L.i < 0) continue;
        const t = rm ? 1 : pop < 0.98 ? 0 : clamp((q - (FILL_Q0 + L.i * FILL_STEP)) / FILL_STEP),
          it = bowlItem(t);
        bounce += it.settle;
        L.el.style.opacity = it.a.toFixed(3);
        L.el.style.transform = "translate3d(0," + (it.dy * h).toFixed(2) + "px,0)";
      }
      y += Math.min(1, bounce) * h * 0.016;
      this.state.fill = rm ? 5 : bowlFill(q, pop);
      if (this.rtl) {
        x = W - x - w;
        flip = true;
      }
    }
    if (!this.on) op = 0;
    // Round 6 (handoff-landing-fix SPEC F3 rule 4): his box stays inside the
    // canvas (canvas y 0 to H; y here is canvas y - 120), allowing for the
    // tilt about the surfer's 50% 92% origin.
    if (H > 0) {
      const a = (Math.abs(rot) * Math.PI) / 180,
        oy = this.kind === "surf" ? 0.92 : 0.5,
        side = (w / 2) * Math.sin(a),
        up = Math.max(0, side - oy * h * (1 - Math.cos(a))),
        down = Math.max(0, side - (1 - oy) * h * (1 - Math.cos(a)));
      y = Math.min(H - 120 - h - down, Math.max(-120 + up, y));
    }
    this.state.x = x;
    this.state.y = y;
    this.state.rot = rot;
    this.state.op = op;
    this.el.style.opacity = op.toFixed(3);
    this.el.style.transform =
      "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) rotate(" + rot.toFixed(2) + "deg) scale(" + ((flip ? -1 : 1) * sc).toFixed(4) + "," + sc.toFixed(4) + ")";
  }
}
