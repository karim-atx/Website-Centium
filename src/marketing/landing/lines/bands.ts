// Centium landing v29: the band lines, a literal TypeScript port of the
// handover's centium-bands-v25.js (CentiumBands): Band (the WK1 chapter
// bands), Num404 (the 404 numerals drawn by a ribbon of lines) and Reply (the
// Contact page's reply line). Same maths, widths, passes and timings.
// Code-split; used by later sections (bands, Contact, 404). The prototype's
// Drift class is not used by any v29 page and is not ported.
//
// Passes per line (no live blur): glow 9x, 6.6x, 4.6x, 3.2x, 2.2x (low: 5x,
// 2.6x), then 1.45x, body 1x, travelling dash 0.5x, filament 0.16x, dashed
// filament 0.08x on lines over 14px. Pulse 28.5 s, flow loop 18 s. Backing
// store = size x devicePixelRatio (max 2; 1 on low).

const TAU = Math.PI * 2,
  LOOP = 18,
  PULSE = 28.5;
const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ss = (v: number) => {
  v = clamp(v);
  return v * v * (3 - 2 * v);
};
const COL = { lav: ["109,80,198", "140,116,222", "174,161,220"], teal: ["66,146,134", "110,172,162", "162,200,194"] } as const;
type Hue = keyof typeof COL;
type Pt = [number, number];
const rng = (s: number) => () => {
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 4294967296;
};

export interface BandLineOptions {
  q: "high" | "low";
  rm: boolean;
  alpha: number;
  seed: number;
}

interface BaseLine {
  hue: Hue;
  w: number;
  a: number;
  ph: number;
  sp: number;
}

class Base<O extends BandLineOptions, Ln extends BaseLine> {
  o: O;
  w = 0;
  h = 0;
  k = 1;
  L: Ln[] = [];
  protected ctx: CanvasRenderingContext2D;

  readonly cv: HTMLCanvasElement;

  constructor(cv: HTMLCanvasElement, opt: Partial<O>, defaults: Partial<O>) {
    this.cv = cv;
    this.ctx = cv.getContext("2d")!;
    this.o = Object.assign({ q: "high", rm: false, alpha: 1 }, defaults, opt) as O;
  }

  protected size(): boolean {
    const r = this.cv.getBoundingClientRect();
    if (!r.width) return false;
    this.w = r.width;
    this.h = r.height;
    this.k = this.o.q === "low" ? 1 : Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    this.cv.width = Math.round(this.w * this.k);
    this.cv.height = Math.round(this.h * this.k);
    return true;
  }

  protected pulse(l: BaseLine, t: number) {
    const c = Math.sin((t / PULSE) * TAU + l.ph * 2.3);
    return 0.86 + 0.42 * Math.pow(Math.max(0, c), 5);
  }

  protected line(l: BaseLine, pts: Pt[], t: number) {
    const c = this.ctx,
      C = COL[l.hue],
      low = this.o.q === "low",
      p0 = pts[0],
      p1 = pts[pts.length - 1];
    const pass = (wm: number, am: number, dash: boolean) => {
      const a = Math.min(1, l.a * am * this.pulse(l, t) * this.o.alpha),
        g = c.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
      g.addColorStop(0, "rgba(" + C[2] + ",0)");
      g.addColorStop(0.2, "rgba(" + C[1] + "," + (a * 0.7).toFixed(3) + ")");
      g.addColorStop(0.5, "rgba(" + C[0] + "," + a.toFixed(3) + ")");
      g.addColorStop(0.8, "rgba(" + C[1] + "," + (a * 0.7).toFixed(3) + ")");
      g.addColorStop(1, "rgba(" + C[2] + ",0)");
      c.strokeStyle = g;
      c.lineWidth = Math.max(0.6, l.w * wm);
      c.lineCap = dash ? "butt" : "round";
      if (dash) {
        const L = this.w * 0.1;
        c.setLineDash([L, this.w * 0.14]);
        c.lineDashOffset = -(((t / LOOP) * this.w * 3.4 * l.sp) % (this.w * 0.24));
      } else c.setLineDash([]);
      c.beginPath();
      pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
      c.stroke();
    };
    if (!low) {
      pass(9, 0.028, false);
      pass(6.6, 0.045, false);
      pass(4.6, 0.07, false);
      pass(3.2, 0.11, false);
      pass(2.2, 0.16, false);
    } else {
      pass(5, 0.05, false);
      pass(2.6, 0.12, false);
    }
    pass(1.45, 0.26, false);
    pass(1, 0.8, false);
    if (!this.o.rm) pass(0.5, 1.15, true);
    if (!low) {
      pass(0.16, 0.72, false);
      if (l.w > 14 && !this.o.rm) pass(0.08, 0.5, true);
    }
    c.setLineDash([]);
  }

  widths() {
    const w = (this.L || []).map((l) => l.w).sort((a, b) => a - b);
    return { n: w.length, min: +(w[0] || 0).toFixed(1), max: +(w[w.length - 1] || 0).toFixed(1), median: +(w[w.length >> 1] || 0).toFixed(1) };
  }
}

// ---------------------------------------------------------------------------
// Band: n lines entering from the left, drawn left to right by scroll progress p.

export interface BandOptions extends BandLineOptions {
  n: number;
  /** Dominant colour: 74% of the lines take it, the rest the other. */
  dom?: Hue;
}
interface BandLine extends BaseLine {
  y: number;
  k: number;
  k2: number;
  ph2: number;
  dr: number;
  lag: number;
}

export class Band extends Base<BandOptions, BandLine> {
  constructor(cv: HTMLCanvasElement, opt: Partial<BandOptions>) {
    super(cv, opt, { n: 7, alpha: 0.55, seed: 2026 });
    this.resize();
  }

  resize() {
    if (!this.size()) return;
    const r = rng(this.o.seed),
      mob = this.w < 640;
    this.L = Array.from({ length: this.o.n }, (_, i) => {
      const th = r();
      return {
        y: 0.34 + 0.32 * (i / Math.max(1, this.o.n - 1)) + (r() - 0.5) * 0.04,
        hue: this.o.dom ? (r() < 0.74 ? this.o.dom : this.o.dom === "teal" ? "lav" : "teal") : i % 2 ? "teal" : "lav",
        w: (th < 0.5 ? 2.4 + th * 10 : th < 0.84 ? 12 + r() * 24 : 32 + r() * 36) * (mob ? 0.4 : 0.55),
        a: 0.42 + r() * 0.3,
        k: 0.55 + r() * 0.9,
        k2: 1.3 + r() * 1.4,
        ph: r() * TAU,
        ph2: r() * TAU,
        dr: (r() - 0.5) * 2.4,
        sp: 0.7 + r() * 0.7,
        lag: r() * 0.2,
      };
    });
  }

  draw(p: number, t: number) {
    if (!this.w) return;
    const c = this.ctx,
      W = this.w,
      H = this.h,
      tt = this.o.rm ? 0 : t;
    p = this.o.rm ? 1 : clamp(p);
    c.setTransform(this.k, 0, 0, this.k, 0, 0);
    c.clearRect(0, 0, W, H);
    if (p <= 0.002) return;
    c.lineJoin = "round";
    const maxW = Math.max(...this.L.map((q) => q.w)),
      amp = Math.min(maxW * (W < 640 ? 2 : 2.6), H * 0.16);
    for (const l of this.L) {
      const r = ss((p - l.lag * 0.6) / (1 - l.lag * 0.6));
      if (r <= 0.003) continue;
      const pts: Pt[] = [],
        N = Math.ceil(110 * r),
        dr = (p - 0.5) * l.dr;
      for (let i = 0; i <= N; i++) {
        const u = (i / N) * r,
          x = -0.1 * W + u * 1.2 * W,
          ph = (tt / LOOP) * TAU * l.sp;
        const y = H * l.y + amp * (0.62 * Math.sin(u * TAU * l.k - ph + l.ph + dr) + 0.38 * Math.sin(u * TAU * l.k2 + ph * 0.6 + l.ph2 - dr * 0.7));
        pts.push([x, y]);
      }
      this.line(l, pts, tt);
    }
  }
}

// ---------------------------------------------------------------------------
// Num404: one stream enters at the left edge at the first 4's crossbar height,
// climbs its diagonal, runs down its stem, loops once round the 0, crosses
// into the second 4 the same way and leaves at the right edge. `box` = the
// rect the numerals fill (canvas px). render(t): t < 0 hidden, 0..1.8 s draws
// in, then breathing and a pulse that pauses one beat in the 0 (6.4 s loop).

export interface Num404Options extends BandLineOptions {
  k: number;
}
interface NumLine extends BaseLine {
  k: number;
}
interface NumPath {
  pts: Pt[];
  len: number[];
  nor: Pt[];
  total: number;
  band: number;
  zero: number;
  S: number;
}

export class Num404 extends Base<Num404Options, NumLine> {
  done = false;
  box: { x: number; y: number; w: number; h: number } | null = null;
  path: NumPath | null = null;
  onDone: (() => void) | null = null;
  sym: Record<string, unknown> = {};

  constructor(cv: HTMLCanvasElement, opt: Partial<Num404Options>) {
    super(cv, opt, { k: 10, alpha: 0.62, seed: 404 });
    this.resize();
  }

  resize() {
    if (!this.size()) return;
    const r = rng(this.o.seed),
      K = this.o.k;
    this.L = Array.from({ length: K }, (_, i) => {
      const th = r(),
        mid = Math.abs(i - (K - 1) / 2) < 1;
      return {
        hue: i % 2 ? "teal" : "lav",
        w: mid ? 3.6 + r() * 1.6 : th < 0.55 ? 0.9 + r() * 1.1 : th < 0.85 ? 1.6 + r() * 1.4 : 2.8 + r() * 1.6,
        a: 0.5 + r() * 0.35,
        ph: r() * TAU,
        sp: 0.7 + r() * 0.6,
        k: 0.6 + r() * 0.8,
      };
    });
    this.path = null;
  }

  private build() {
    const B = this.box!,
      W = this.w,
      maxW = Math.max(...this.L.map((q) => q.w)),
      S0 = Math.min(B.w / 3.25, B.h / 1.62),
      ov = ((S0 * 0.2) / 2) * 1.08 + maxW * 1.3 + 6,
      S = Math.max(10, Math.min((B.w - 2 * ov) / 3.25, (B.h - 2 * ov) / 1.4)),
      gx = B.x + (B.w - 3.25 * S) / 2 + 0.04 * S,
      gy = B.y + (B.h - 1.4 * S) / 2,
      P = (u: number, v: number): Pt => [gx + u * S, gy + v * S],
      raw: Pt[] = [];
    const seg = (a: Pt, c: Pt, n: number) => {
      for (let i = 1; i <= n; i++) raw.push([a[0] + ((c[0] - a[0]) * i) / n, a[1] + ((c[1] - a[1]) * i) / n]);
    };
    const four = (x: number, first: boolean) => {
      const A = P(x, 0.95),
        R = P(x + 0.98, 0.95),
        T = P(x + 0.66, 0),
        M = P(x + 0.66, 0.95),
        F = P(x + 0.66, 1.4);
      seg(raw[raw.length - 1], A, first ? 24 : 6);
      seg(A, R, 14);
      (
        [
          [x + 1.04, 0.9],
          [x + 0.98, 0.8],
          [x + 0.82, 0.78],
          [x + 0.7, 0.68],
        ] as const
      ).forEach((q) => raw.push(P(q[0], q[1])));
      seg(raw[raw.length - 1], T, 14);
      seg(T, A, 18);
      seg(A, M, 8);
      seg(M, F, 10);
    };
    raw.push([-0.08 * W, P(0, 0.95)[1]]);
    four(0, true);
    const cx = 1.76,
      cy0 = 0.7,
      rx = 0.46,
      ry = 0.68;
    (
      [
        [0.86, 1.36],
        [1.12, 1.1],
      ] as const
    ).forEach((q) => raw.push(P(q[0], q[1])));
    seg(raw[raw.length - 1], P(cx - rx, cy0), 6);
    for (let k = 1; k <= 96; k++) {
      const a = Math.PI + (3 * Math.PI * k) / 96;
      raw.push(P(cx + rx * Math.cos(a), cy0 + ry * Math.sin(a)));
    }
    const o4 = 2.42;
    four(o4, false);
    (
      [
        [o4 + 0.9, 1.36],
        [o4 + 1.12, 1.12],
      ] as const
    ).forEach((q) => raw.push(P(q[0], q[1])));
    seg(raw[raw.length - 1], [1.08 * W, P(o4 + 1.2, 1.0)[1]], 24);
    let pts = raw;
    for (let it = 0; it < 3; it++) {
      const q: Pt[] = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i],
          c = pts[i + 1];
        q.push([a[0] * 0.75 + c[0] * 0.25, a[1] * 0.75 + c[1] * 0.25], [a[0] * 0.25 + c[0] * 0.75, a[1] * 0.25 + c[1] * 0.75]);
      }
      q.push(pts[pts.length - 1]);
      pts = q;
    }
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const nor = pts.map((_, i): Pt => {
      const a = pts[Math.max(0, i - 1)],
        c = pts[Math.min(pts.length - 1, i + 1)],
        dx = c[0] - a[0],
        dy = c[1] - a[1],
        m = Math.hypot(dx, dy) || 1;
      return [-dy / m, dx / m];
    });
    let zs = 0;
    {
      const z0 = P(cx, cy0 + ry);
      let best = 1e9;
      pts.forEach((p, i) => {
        const d = Math.abs(p[0] - z0[0]) + Math.abs(p[1] - z0[1]);
        if (d < best) {
          best = d;
          zs = len[i];
        }
      });
    }
    this.path = { pts, len, nor, total: len[len.length - 1], band: S * 0.24, zero: zs, S };
  }

  render(t: number) {
    if (!this.w || !this.box) return;
    if (!this.path) this.build();
    const c = this.ctx,
      Pa = this.path!,
      K = this.L.length,
      DRAW = 1.8,
      rm = this.o.rm;
    const tt = rm ? 99 : t;
    c.setTransform(this.k, 0, 0, this.k, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    if (tt < 0) return;
    const ease = (v: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, v)), 3),
      dr = ease(tt / DRAW),
      lim = Pa.total * dr,
      br = rm ? 0 : Math.sin(tt * 0.9) * 0.08;
    c.lineJoin = "round";
    this.L.forEach((l, i) => {
      const off = ((i - (K - 1) / 2) / Math.max(1, K - 1)) * Pa.band * (1 + br),
        pts: Pt[] = [];
      for (let j = 0; j < Pa.pts.length; j++) {
        if (Pa.len[j] > lim) break;
        const p = Pa.pts[j],
          n = Pa.nor[j],
          w2 = rm ? 0 : Math.sin((Pa.len[j] / Pa.S) * l.k * 2 - tt * l.sp + l.ph) * Pa.band * 0.06;
        pts.push([p[0] + n[0] * (off + w2), p[1] + n[1] * (off + w2)]);
      }
      if (pts.length > 1) this.line(l, pts, rm ? 0 : tt);
    });
    if (dr >= 1 && !this.done) {
      this.done = true;
      this.onDone?.();
    }
    if (!rm && dr >= 1) {
      const LP = 6.4,
        ph = (tt - DRAW) % LP;
      let s: number | null = null;
      if (ph < 2.2) s = Pa.zero * (ph / 2.2);
      else if (ph < 2.9) s = Pa.zero;
      else if (ph < 5.6) s = Pa.zero + (Pa.total - Pa.zero) * ((ph - 2.9) / 2.7);
      if (s != null) {
        const sv = s;
        const j0 = Pa.len.findIndex((v) => v >= sv - Pa.S * 0.5),
          j1 = Pa.len.findIndex((v) => v >= sv + Pa.S * 0.5);
        if (j0 >= 0) {
          const seg = Pa.pts.slice(j0, j1 < 0 ? undefined : j1);
          if (seg.length > 1) {
            const a = seg[0],
              z = seg[seg.length - 1],
              gr = c.createLinearGradient(a[0], a[1], z[0], z[1]);
            gr.addColorStop(0, "rgba(186,170,240,0)");
            gr.addColorStop(0.5, "rgba(186,170,240," + (ph >= 2.2 && ph < 2.9 ? 0.5 : 0.6) + ")");
            gr.addColorStop(1, "rgba(186,170,240,0)");
            c.strokeStyle = gr;
            c.lineCap = "round";
            c.lineWidth = Pa.band * 1.1;
            c.beginPath();
            seg.forEach((q, k) => (k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
            c.stroke();
          }
        }
      }
    }
    const ws = this.L.map((q) => q.w).sort((a, z) => a - z);
    this.sym = {
      lines: K,
      band: Math.round(Pa.band),
      glyphW: Math.round(this.box.w),
      glyphH: Math.round(this.box.h),
      widths: [+ws[0].toFixed(1), +ws[ws.length - 1].toFixed(1)],
      drawn: +dr.toFixed(2),
    };
  }
}

// ---------------------------------------------------------------------------
// Reply: the Contact page's response window, an arc from your message to our
// reply with lines around it; one calm pass (draw(p), p 0..1), then still.

interface ReplyLine extends BaseLine {
  y: number;
  k: number;
}

export class Reply extends Base<BandLineOptions & { n: number }, ReplyLine> {
  constructor(cv: HTMLCanvasElement, opt: Partial<BandLineOptions & { n: number }>) {
    super(cv, opt, { n: 4, alpha: 0.7, seed: 77 });
    this.resize();
  }

  resize() {
    if (!this.size()) return;
    const r = rng(this.o.seed);
    this.L = Array.from({ length: this.o.n }, (_, i) => ({
      y: [0.22, 0.4, 0.7, 0.86][i],
      hue: i % 2 ? "teal" : "lav",
      w: [3, 14, 6, 22][i],
      a: 0.34 + r() * 0.2,
      k: 0.6 + r() * 0.5,
      ph: r() * TAU,
      sp: 1,
    }));
  }

  geo() {
    const W = this.w,
      H = this.h;
    return { x0: W * 0.16, x1: W * 0.84, y: H * 0.72, top: H * 0.2 };
  }

  draw(p: number) {
    if (!this.w) return;
    p = this.o.rm ? 1 : clamp(p);
    const c = this.ctx,
      W = this.w,
      H = this.h,
      g = this.geo(),
      t = 4 * p;
    c.setTransform(this.k, 0, 0, this.k, 0, 0);
    c.clearRect(0, 0, W, H);
    c.lineJoin = "round";
    const lr = ss(p / 0.7);
    for (const l of this.L) {
      const pts: Pt[] = [],
        N = Math.ceil(56 * lr);
      if (N < 1) continue;
      for (let i = 0; i <= N; i++) {
        const u = (i / N) * lr,
          x = -0.05 * W + u * 1.1 * W;
        const d = (x - W / 2) / (W * 0.42),
          arcY = g.y - (g.y - g.top) * Math.max(0, 1 - d * d);
        let y = l.y * H + Math.sin(u * TAU * l.k + l.ph - t * 0.3) * H * 0.05;
        if (l.y < 0.6) y = Math.min(y, arcY - 14 - l.w);
        else y = Math.max(y, g.y + 12 + l.w * 0.5);
        pts.push([x, y]);
      }
      this.line(l, pts, 0);
    }
    const ar = ss((p - 0.15) / 0.75),
      N = 60;
    c.lineCap = "round";
    c.strokeStyle = "#E4DCF8";
    c.lineWidth = 3;
    c.setLineDash([2, 6]);
    c.beginPath();
    for (let i = 0; i <= N; i++) {
      const u = i / N,
        x = g.x0 + (g.x1 - g.x0) * u,
        y = g.y - (g.y - g.top) * Math.sin(Math.PI * u);
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.stroke();
    c.setLineDash([]);
    if (ar > 0) {
      const gr = c.createLinearGradient(g.x0, 0, g.x1, 0);
      gr.addColorStop(0, "#7D67D9");
      gr.addColorStop(1, "#5E9E95");
      c.strokeStyle = gr;
      c.lineWidth = 3;
      c.beginPath();
      for (let i = 0; i <= Math.ceil(N * ar); i++) {
        const u = Math.min(ar, i / N),
          x = g.x0 + (g.x1 - g.x0) * u,
          y = g.y - (g.y - g.top) * Math.sin(Math.PI * u);
        if (i) c.lineTo(x, y);
        else c.moveTo(x, y);
      }
      c.stroke();
    }
    const dot = (x: number, y: number, col: string, a: number) => {
      c.globalAlpha = a;
      c.fillStyle = "#FFFFFF";
      c.beginPath();
      c.arc(x, y, 8, 0, TAU);
      c.fill();
      c.fillStyle = col;
      c.beginPath();
      c.arc(x, y, 5, 0, TAU);
      c.fill();
      c.globalAlpha = 1;
    };
    dot(g.x0, g.y, "#7D67D9", ss(p / 0.15));
    dot(g.x1, g.y, "#5E9E95", ss((ar - 0.9) / 0.1));
    return { x0: g.x0, x1: g.x1, y: g.y };
  }
}

export { pickBands } from "./pickBands";
