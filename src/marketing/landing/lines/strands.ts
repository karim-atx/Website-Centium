// Centium landing v29: the intro line field, a literal TypeScript port of the
// handover's centium-strands-v24.js (CentiumStrands): same maths, widths,
// passes and timings. Code-split (loaded by the motion engine).
//
// - Lines grow from the screen edge toward their target box: reach r draws u
//   in [0, r], so the tip leads, sits on the box at r = 1, retracts as r falls.
// - Widths (on screen): half thin 2.4 to 7.4px, a third medium 12 to 36px,
//   the rest thick 32 to 68px (x0.62 under 640px, x0.85 under 1100px).
// - Passes: a soft glow of six widening faint strokes (9x to 1.45x) drawn into
//   a cached layer refreshed every third frame, then body 1x, travelling dash
//   0.5x, filament 0.16x, dashed filament 0.08x on lines over 14px. No blur.
// - Pulse 28.5 s (0.86 + 0.42 * max(0, sin)^5), flow loop 18 s.
// - Backing store = displayed size x devicePixelRatio (max 2; 1 on low).
// - Phones (o.swirl + o.arc): partial arcs, top clockwise, bottom counter-clockwise.

const TAU = Math.PI * 2,
  LOOP = 18,
  PULSE = 28.5;
const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const LINE_COLOURS = { lav: ["109,80,198", "140,116,222", "174,161,220"], teal: ["66,146,134", "110,172,162", "162,200,194"] } as const;
export type Hue = keyof typeof LINE_COLOURS;

export interface StrandRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Swirl {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}
export interface StrandsOptions {
  q: "high" | "low";
  rm: boolean;
  seed: number;
  vert?: boolean;
  swirl?: Swirl | null;
  arc?: boolean;
}
export interface GroupDef {
  side: number;
  n: number;
  hue: Hue;
}
interface Group {
  d: GroupDef;
  rect: StrandRect | null;
  reach: number;
  alpha: number;
}
interface Line {
  g: number;
  side: number;
  hue: Hue;
  t: number;
  w: number;
  alpha: number;
  ys: number;
  bend: number;
  speed: number;
  phase: number;
  wob: number;
  kk: number;
  lag: number;
}
type Pt = [number, number];

export class Strands {
  o: StrandsOptions;
  G: Group[] = [];
  L: Line[] = [];
  amp = 1;
  w = 0;
  h = 0;
  k = 1;
  stats = { visible: 0, total: 0 };
  private ctx: CanvasRenderingContext2D;
  private fr = 0;
  private gl: HTMLCanvasElement;
  private gx: CanvasRenderingContext2D;
  private gk = 1;
  private ws = 1;
  private glOk = false;

  private cv: HTMLCanvasElement;

  constructor(cv: HTMLCanvasElement, opt: Partial<StrandsOptions>) {
    this.cv = cv;
    this.ctx = cv.getContext("2d")!;
    this.o = Object.assign({ q: "high", rm: false, seed: 7331 }, opt) as StrandsOptions;
    this.gl = document.createElement("canvas");
    this.gx = this.gl.getContext("2d")!;
    this.resize();
  }

  resize() {
    const c = this.cv,
      r = c.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.w = r.width;
    this.h = r.height;
    this.k = this.o.q === "low" ? 1 : Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    c.width = Math.round(this.w * this.k);
    c.height = Math.round(this.h * this.k);
    this.gk = this.k;
    this.gl.width = Math.max(2, Math.round(this.w * this.gk));
    this.gl.height = Math.max(2, Math.round(this.h * this.gk));
    this.ws = this.w < 640 ? 0.62 : this.w < 1100 ? 0.85 : 1;
    this.glOk = false;
  }

  groups(defs: GroupDef[]) {
    let seed = this.o.seed;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    this.G = defs.map((d) => ({ d, rect: null, reach: 0, alpha: 1 }));
    this.L = [];
    defs.forEach((d, gi) => {
      for (let i = 0; i < d.n; i++) {
        const th = rnd();
        let w = th < 0.5 ? 1.2 + th * 5 : th < 0.84 ? 6 + rnd() * 12 : 16 + rnd() * 18;
        w *= 2;
        this.L.push({
          g: gi,
          side: d.side,
          hue: d.hue,
          t: d.n > 1 ? 0.1 + (i / (d.n - 1)) * 0.8 : 0.5,
          w,
          alpha: 0.42 + rnd() * 0.3,
          ys: (rnd() - 0.5) * 1.1,
          bend: 0.25 + rnd() * 0.7,
          speed: 0.7 + rnd() * 0.7,
          phase: rnd() * TAU,
          wob: 0.012 + rnd() * 0.018,
          kk: 1.1 + rnd() * 1.4,
          lag: (i / Math.max(1, d.n - 1)) * 0.18,
        });
      }
    });
  }

  set(gi: number, o: Partial<Pick<Group, "rect" | "reach" | "alpha">>) {
    if (this.G[gi]) Object.assign(this.G[gi], o);
  }

  private tip(l: Line, R: StrandRect): Pt {
    if (this.o.vert) return [R.x + R.w * l.t, l.side < 0 ? R.y + 2 : R.y + R.h - 2];
    return [l.side < 0 ? R.x + 2 : R.x + R.w - 2, R.y + R.h * l.t];
  }

  private pt(l: Line, R: StrandRect, u: number, t: number): Pt {
    if (this.o.swirl && this.o.arc) {
      const Z = this.o.swirl,
        top = l.side < 0,
        e = this.tip(l, R),
        sweep = (0.25 + 0.08 * Math.abs(l.ys)) * TAU * (top ? 1 : -1),
        ang1 = Math.atan2(e[1] - Z.cy, e[0] - Z.cx),
        ang0 = ang1 - sweep,
        s = (v: number) => v * v * (3 - 2 * v),
        a = ang0 + (ang1 - ang0) * s(u),
        d1 = Math.hypot(e[0] - Z.cx, e[1] - Z.cy),
        d0 = Math.max(d1 + 60, Math.hypot(this.w, this.h) / 2 + 40),
        d = d0 + (d1 - d0) * s(u);
      return [Z.cx + d * Math.cos(a), Z.cy + d * Math.sin(a)];
    }
    if (this.o.swirl) {
      const Z = this.o.swirl,
        top = l.side < 0,
        dir = top ? 1 : -1,
        a0 = top ? -Math.PI / 2 : Math.PI / 2,
        title = l.g >= 5;
      let aE: number, kE: number;
      if (title) {
        aE = a0 + dir * (Math.PI * 0.75 + l.t * 1.4);
        kE = 1.05 + l.t * 0.12;
      } else {
        const e: Pt = [R.x + R.w * l.t, top ? R.y + R.h - 2 : R.y + 2];
        const ex = (e[0] - Z.cx) / Z.rx,
          ey = (e[1] - Z.cy) / Z.ry;
        aE = Math.atan2(ey, ex);
        kE = Math.max(1.02, Math.hypot(ex, ey));
        if (top) {
          while (aE < a0 + 0.5) aE += TAU;
        } else {
          while (aE > a0 - 0.5) aE -= TAU;
        }
      }
      const as = a0 - dir * (0.55 + l.ys * 0.3),
        ks = (Z.cy + 40) / Z.ry + 0.4,
        kO = 1.08 + Math.abs(l.ys) * 0.35,
        s = (v: number) => v * v * (3 - 2 * v),
        k = u < 0.35 ? ks + (kO - ks) * s(u / 0.35) : kO + (kE - kO) * s((u - 0.35) / 0.65),
        a = as + (aE - as) * u,
        wob = 1 + Math.sin(u * l.kk * TAU - (t / LOOP) * TAU * l.speed + l.phase) * l.wob * 1.5 * u * (1 - u);
      return [Z.cx + Z.rx * k * wob * Math.cos(a), Z.cy + Z.ry * k * wob * Math.sin(a)];
    }
    if (this.o.vert) {
      const W = this.w,
        H = this.h,
        e = this.tip(l, R),
        sy = l.side < 0 ? -0.08 * H : 1.08 * H,
        sx = e[0] + l.ys * W * 0.5,
        x1 = sx + (e[0] - sx) * 0.08 - l.bend * W * 0.07,
        y1 = sy + (e[1] - sy) * 0.38,
        x2 = e[0] + l.bend * W * 0.03,
        y2 = sy + (e[1] - sy) * 0.76,
        m = 1 - u;
      let x = m * m * m * sx + 3 * m * m * u * x1 + 3 * m * u * u * x2 + u * u * u * e[0];
      const y = m * m * m * sy + 3 * m * m * u * y1 + 3 * m * u * u * y2 + u * u * u * e[1];
      x += Math.sin(u * l.kk * TAU - (t / LOOP) * TAU * l.speed + l.phase) * W * l.wob * 4 * u * (1 - u);
      return [x, y];
    }
    const W = this.w,
      H = this.h,
      e = this.tip(l, R),
      sx = l.side < 0 ? -0.08 * W : 1.08 * W,
      sy = e[1] + l.ys * H * 0.6;
    const x1 = sx + (e[0] - sx) * 0.38,
      y1 = sy + (e[1] - sy) * 0.08 - l.bend * H * 0.07;
    const x2 = sx + (e[0] - sx) * 0.76,
      y2 = e[1] + l.bend * H * 0.03;
    const m = 1 - u;
    const x = m * m * m * sx + 3 * m * m * u * x1 + 3 * m * u * u * x2 + u * u * u * e[0];
    let y = m * m * m * sy + 3 * m * m * u * y1 + 3 * m * u * u * y2 + u * u * u * e[1];
    y += Math.sin(u * l.kk * TAU - (t / LOOP) * TAU * l.speed + l.phase) * H * l.wob * 4 * u * (1 - u);
    return [x, y];
  }

  private pulse(l: Line, t: number) {
    const c = Math.sin((t / PULSE) * TAU + l.phase * 2.3);
    return 0.86 + 0.42 * Math.pow(Math.max(0, c), 5);
  }

  private path(l: Line, R: StrandRect, r: number, t: number): Pt[] {
    const N = Math.max(4, Math.ceil((this.o.q === "low" ? 28 : 48) * r)),
      pts: Pt[] = [];
    for (let i = 0; i <= N; i++) pts.push(this.pt(l, R, (i / N) * r, t));
    return pts;
  }

  private stroke(c: CanvasRenderingContext2D, l: Line, pts: Pt[], r: number, t: number, wm: number, am: number, dash: boolean, sc: number) {
    const C = LINE_COLOURS[l.hue] || LINE_COLOURS.lav,
      a = Math.min(1, l.alpha * am * this.pulse(l, t)),
      N = pts.length - 1;
    const p0 = pts[0],
      p1 = pts[N],
      g = c.createLinearGradient(p0[0] * sc, p0[1] * sc, p1[0] * sc, p1[1] * sc),
      tipA = wm >= 2 ? 0.08 : r >= 0.999 ? 0.55 : 0.3 + 0.3 * r;
    g.addColorStop(0, "rgba(" + C[2] + ",0)");
    g.addColorStop(0.2, "rgba(" + C[1] + "," + (a * 0.7).toFixed(3) + ")");
    g.addColorStop(0.62, "rgba(" + C[0] + "," + a.toFixed(3) + ")");
    g.addColorStop(1, "rgba(" + C[0] + "," + (a * tipA).toFixed(3) + ")");
    c.strokeStyle = g;
    c.lineCap = dash ? "butt" : "round";
    if (dash) {
      const L = this.w * 0.1 * sc;
      c.setLineDash([L, this.w * 0.14 * sc]);
      c.lineDashOffset = -(((t / LOOP) * this.w * 3.4 * l.speed * sc) % (this.w * 0.24 * sc));
    } else c.setLineDash([]);
    c.lineWidth = Math.max(0.6, l.w * this.ws * wm) * sc;
    c.beginPath();
    c.moveTo(pts[0][0] * sc, pts[0][1] * sc);
    for (let i = 1; i <= N; i++) c.lineTo(pts[i][0] * sc, pts[i][1] * sc);
    c.stroke();
  }

  render(t: number) {
    const c = this.ctx;
    if (!this.w) return;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.cv.width, this.cv.height);
    const tt = this.o.rm ? 0 : t,
      low = this.o.q === "low",
      live: [Line, Group, number, Pt[]][] = [];
    for (const l of this.L) {
      const G = this.G[l.g];
      if (!G || !G.rect || G.alpha <= 0.003) continue;
      const r = clamp((G.reach - l.lag) / (1 - l.lag));
      if (r <= 0.004) continue;
      const e = r * r * (3 - 2 * r);
      live.push([l, G, e, this.path(l, G.rect, e, tt)]);
    }
    this.stats = { visible: live.length, total: this.L.length };
    if (!live.length || this.amp <= 0.003) {
      this.glOk = false;
      return;
    }
    const A = (G: Group) => G.alpha * this.amp;
    if (!low) {
      if (!this.glOk || this.fr++ % 3 === 0 || this.o.rm) {
        const gx = this.gx;
        gx.setTransform(1, 0, 0, 1, 0, 0);
        gx.clearRect(0, 0, this.gl.width, this.gl.height);
        gx.lineJoin = "round";
        for (const [l, G, r, pts] of live) {
          (
            [
              [9, 0.028],
              [6.6, 0.045],
              [4.6, 0.07],
              [3.2, 0.11],
              [2.2, 0.16],
              [1.45, 0.24],
            ] as const
          ).forEach(([m, a]) => this.stroke(gx, l, pts, r, tt, m, a * A(G), false, this.gk));
        }
        this.glOk = true;
      }
      c.imageSmoothingEnabled = true;
      c.drawImage(this.gl, 0, 0, this.cv.width, this.cv.height);
    }
    c.lineJoin = "round";
    const K = this.k;
    for (const [l, G, r, pts] of live) this.stroke(c, l, pts, r, tt, 1, 0.92 * A(G), false, K);
    if (!this.o.rm) for (const [l, G, r, pts] of live) this.stroke(c, l, pts, r, tt, 0.5, 1.15 * A(G), true, K);
    if (!low) {
      for (const [l, G, r, pts] of live) this.stroke(c, l, pts, r, tt, 0.16, 0.72 * A(G), false, K);
      if (!this.o.rm) for (const [l, G, r, pts] of live) if (l.w > 14) this.stroke(c, l, pts, r, tt, 0.08, 0.5 * A(G), true, K);
    }
    c.setLineDash([]);
  }

  /** Width statistics (prototype `widths`, used by its QA). */
  widths() {
    const w = this.L.map((l) => l.w * this.ws);
    const s = w.slice().sort((a, b) => a - b);
    return {
      min: +s[0].toFixed(1),
      max: +s[s.length - 1].toFixed(1),
      median: +s[s.length >> 1].toFixed(1),
      thin: w.filter((x) => x < 8 * this.ws).length,
      mid: w.filter((x) => x >= 8 * this.ws && x < 32 * this.ws).length,
      thick: w.filter((x) => x >= 32 * this.ws).length,
    };
  }
}
