// The At a glance gauge cluster's geometry, ported line for line from the
// handoff's BizSummaryV27.dc.html (`gaugeX`, `petalsX`, `balanceX`,
// `nodesX`, the `blank` gauge and the `cl` cluster IIFE), with gaugeAlt "a"
// and layout "gaps" (D-BU4-2, DA1-015 #9-#19). Pure functions: no React, so
// the numbers can be checked against the source in isolation.
//
// Every constant below is the source's own. The only changes are inputs: the
// source's sample arrays (FILLS, the weekly joined / ended split, prevNet) are
// parameters here, filled from real rows by the Dashboard.

import type { DashPalette } from "./palette";

export interface Shape {
  d: string;
  fill: string;
  stroke: string;
  sw: number;
  dash: string;
  op: number;
  cap: "round" | "butt";
}

const S = (d: string, fill: string, stroke: string, sw: number, dash = "none", op = 1, cap: "round" | "butt" = "round"): Shape => ({
  d,
  fill,
  stroke,
  sw,
  dash,
  op,
  cap,
});

// ---- one gauge, in its own 150-unit space (centre 75,46) --------------------
const cx = 75;
const cy = 46;
const pt = (a: number, r: number): [number, number] => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
const arc = (a0: number, a1: number, r: number) => {
  const [x0, y0] = pt(a0, r);
  const [x1, y1] = pt(a1, r);
  const big = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  const sw = a1 > a0 ? 1 : 0;
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${big} ${sw} ${x1.toFixed(2)},${y1.toFixed(2)}`;
};
const dg = (d: number) => (d * Math.PI) / 180;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const circ = (x: number, y: number, r: number) => `M${x - r},${y} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 -${2 * r},0`;
const G0 = dg(135);
const SPAN = dg(300);

/** ease-out cubic, the source's `ease`. */
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
/** The start-up total: 800 ms + 3 × 80 ms stagger (V6-106: the source wins). */
export const STARTUP_MS = 800 + 3 * 80;
/** prog(i) while the start-up plays at time t (ms). */
export const progAt = (t: number, i: number) => easeOut(Math.max(0, Math.min(1, (t - 80 * i) / 800)));

export type GaugeSpec =
  | { kind: "ring"; fills: number[]; pct: number }
  | { kind: "petals"; vals: number[]; last: number[]; today: number }
  | { kind: "balance"; weeksJoined: number[]; weeksEnded: number[]; joined: number; ended: number; prevNet: number }
  | { kind: "nodes"; used: number; total: number }
  | { kind: "blank" };

interface Ids {
  /** linearGradient id (g0 → g1). */
  gid: string;
  /** radialGradient id (g1 at 16% → 0). */
  rid: string;
}

/** The shapes of one gauge at progress `e` (0..1). */
export function gaugeShapes(spec: GaugeSpec, e: number, empty: boolean, c: DashPalette, ids: Ids): Shape[] {
  const glow = (r: number) => S(circ(cx, cy, r), `url(#${ids.rid})`, "none", 0);
  const SEG = (a0: number, a1: number, r: number, col: string, w: number, op?: number) => S(arc(a0, a1, r), "none", col, w, "none", op == null ? 1 : op, "butt");
  const halo = (r: number) => S(circ(cx, cy, r), c.halo, "none", 0);

  if (spec.kind === "blank") {
    return [halo(34), S(circ(cx, cy, 46), "none", c.track, 1.2, "1 5"), S(circ(cx, cy, 38), "none", c.track, 1)];
  }

  if (spec.kind === "ring") {
    // gaugeX: one segment per class this week, coloured by its fill.
    const fills = spec.fills.length ? spec.fills : [0];
    const s: Shape[] = [glow(36)];
    const n = fills.length;
    const gap = dg(3.4);
    const seg = (SPAN - gap * (n - 1)) / n;
    fills.forEach((f, i) => {
      const a0 = G0 + i * (seg + gap);
      s.push(SEG(a0, a0 + seg, 46, c.track, 6.5));
      const ei = empty ? 0 : clamp(e * 1.3 - i * 0.025);
      if (ei > 0 && f > 0) s.push(SEG(a0, a0 + seg * Math.min(1, f) * ei, 46, f >= 0.9 ? c.pDark : f >= 0.7 ? c.primary : c.caution, 6.5));
    });
    s.push(S(arc(G0, G0 + SPAN, 38), "none", c.track, 2.6));
    const cur = empty ? 0 : spec.pct * e;
    if (cur > 0.004) s.push(S(arc(G0, G0 + SPAN * Math.min(1, cur), 38), "none", `url(#${ids.gid})`, 3.6));
    const ta = G0 + SPAN * 0.7;
    const [ax, ay] = pt(ta, 36);
    const [bx, by] = pt(ta, 50);
    s.push(S(`M${ax.toFixed(2)},${ay.toFixed(2)} L${bx.toFixed(2)},${by.toFixed(2)}`, "none", c.leafInk, 2.2));
    const [dx, dy] = pt(ta, 53);
    s.push(S(circ(dx, dy, 2.2), c.leafInk, "none", 0));
    return s;
  }

  if (spec.kind === "petals") {
    // petalsX: 7 day bars, ghost bars for the same days last week.
    const { vals, last } = spec;
    const n = vals.length;
    const mx = Math.max(...vals, ...last, 1);
    const base = 39;
    const len = 11;
    const s: Shape[] = [glow(34), S(circ(cx, cy, 36.5), "none", c.track, 1.6)];
    vals.forEach((v, i) => {
      const a = G0 + SPAN * ((i + 0.5) / n);
      const [t0x, t0y] = pt(a, 34);
      const [t1x, t1y] = pt(a, 36);
      s.push(S(`M${t0x.toFixed(2)},${t0y.toFixed(2)} L${t1x.toFixed(2)},${t1y.toFixed(2)}`, "none", c.tert, 1, "none", 0.7));
      const [gx0, gy0] = pt(a, base);
      const [gx1, gy1] = pt(a, base + 1 + (last[i] / mx) * len);
      s.push(S(`M${gx0.toFixed(2)},${gy0.toFixed(2)} L${gx1.toFixed(2)},${gy1.toFixed(2)}`, "none", c.ghost, 7.5));
      const ei = empty ? 0 : clamp(e * 1.35 - i * 0.05);
      if (ei > 0) {
        const [x1, y1] = pt(a, base + 1 + (v / mx) * len * ei);
        const today = i === spec.today;
        s.push(S(`M${gx0.toFixed(2)},${gy0.toFixed(2)} L${x1.toFixed(2)},${y1.toFixed(2)}`, "none", today ? c.pDark : v / mx > 0.75 ? c.line : c.primary, 3.8));
        if (today && ei >= 1) s.push(S(circ(x1, y1, 2.4), c.pDark, c.card, 1.2));
      }
    });
    return s;
  }

  if (spec.kind === "balance") {
    // balanceX, option A (segments): joined clockwise from 12, ended
    // counter-clockwise, one segment per week, oldest faintest.
    const { weeksJoined: WJ, weeksEnded: WE, joined: j, ended: en, prevNet } = spec;
    const s: Shape[] = [glow(34)];
    const net = j - en;
    if (!empty && net > 0) s.push(S(circ(cx, cy, 31), c.good, "none", 0, "none", 0.07));
    s.push(S(circ(cx, cy, 38), "none", c.track, 1.6), S(circ(cx, cy, 46), "none", c.track, 6.5, "none", 0.6));
    const step = dg(Math.min(17, 150 / Math.max(j, en, 1)));
    const wg = dg(2.2);
    const W = Math.max(WJ.length, 1);
    for (let k = 1; k <= 8; k++) {
      const t = k * step;
      if (t > dg(155)) break;
      [t, -t].forEach((tt) => {
        const [x0, y0] = pt(tt, 50.5);
        const [x1, y1] = pt(tt, 53);
        s.push(S(`M${x0.toFixed(2)},${y0.toFixed(2)} L${x1.toFixed(2)},${y1.toFixed(2)}`, "none", c.tert, 0.9, "none", 0.8));
      });
    }
    if (!empty) {
      // High contrast (DA1-017 O2): the opacity floor rises so the oldest week stays visible.
      const floor = c.hc ? 0.8 : 0.55;
      const draw = (arr: number[], sign: number, col: string) => {
        let acc0 = 0;
        arr.forEach((n0, w) => {
          const ew = clamp(e * W - w);
          if (n0 > 0 && ew > 0) {
            const a0 = sign * (acc0 * step + wg / 2);
            const a1 = sign * ((acc0 + n0 * ew) * step - wg / 2);
            const op = floor + (1 - floor) * ((w + 1) / W);
            s.push(SEG(Math.min(a0, a1), Math.max(a0, a1), 46, col, 6.5, op));
          }
          acc0 += n0;
        });
      };
      draw(WJ, 1, c.good);
      draw(WE, -1, c.high);
      const na = step * net * clamp(e * 1.2);
      if (Math.abs(na) > 0.01) s.push(S(arc(Math.min(0, na), Math.max(0, na), 38), "none", net >= 0 ? c.good : c.high, 3.4));
      const ga = step * prevNet;
      const [gx0, gy0] = pt(ga, 33.5);
      const [gx1, gy1] = pt(ga, 42.5);
      s.push(S(`M${gx0.toFixed(2)},${gy0.toFixed(2)} L${gx1.toFixed(2)},${gy1.toFixed(2)}`, "none", c.inkSoft, 1.4, "2 1.6", 0.6));
    }
    const [tx0, ty0] = pt(0, 33);
    const [tx1, ty1] = pt(0, 54);
    s.push(S(`M${tx0},${ty0} L${tx1},${ty1}`, "none", c.ink, 1.6));
    const [dx, dy] = pt(0, 55.5);
    s.push(S(`M${dx},${dy - 2.2} l2.2,2.2 l-2.2,2.2 l-2.2,-2.2 Z`, c.ink, "none", 0));
    return s;
  }

  // nodesX, option A (round nodes) in blocks of 5.
  const { used, total } = spec;
  if (empty || total === 0) return [glow(34), S(circ(cx, cy, 36), "none", c.track, 1.2), S(circ(cx, cy, 44), "none", c.track, 1.2, "1 5")];
  const n = Math.max(total, 1);
  const B = Math.max(1, Math.round(n / 5));
  const per = n / B;
  const s: Shape[] = [glow(34), S(circ(cx, cy, 36), "none", c.track, 1.2)];
  const bg = dg(16);
  const arcB = (2 * Math.PI - B * bg) / B;
  const R0 = 44;
  const sr = Math.min(6.8, ((arcB / per) * R0) / 2 - 1.4);
  const lit = used;
  for (let b0 = 0; b0 < B; b0++) {
    const st = b0 * (arcB + bg) - arcB / 2;
    const eb = clamp(e * B - b0);
    const [d0x, d0y] = pt(st - bg / 2, 33);
    const [d1x, d1y] = pt(st - bg / 2, 53);
    if (B > 1) s.push(S(`M${d0x.toFixed(2)},${d0y.toFixed(2)} L${d1x.toFixed(2)},${d1y.toFixed(2)}`, "none", c.tert, 0.9, "none", 0.8));
    for (let q = 0; q < per; q++) {
      const i = b0 * per + q;
      const a = st + (arcB * (q + 0.5)) / per;
      const [x, y] = pt(a, R0);
      const on = i < lit && eb >= (q + 1) / per - 1e-6;
      if (on) {
        s.push(S(circ(x, y, sr + 3.5), `url(#${ids.rid})`, "none", 0), S(circ(x, y, sr), `url(#${ids.gid})`, "none", 0), S(circ(x, y, Math.max(1.4, sr * 0.32)), "#FFFFFF", "none", 0, "none", 0.9));
      } else {
        // High contrast (DA1-019 O2): dashed free nodes at 2.
        s.push(S(circ(x, y, sr), c.card, c.tert, c.hc ? 2 : 1.4, "2.4 2"));
      }
      if (i === n - 1 && n - used <= Math.max(3, per)) {
        const [m0x, m0y] = pt(a, 52.5);
        const [m1x, m1y] = pt(a, 56.5);
        s.push(S(`M${m0x.toFixed(2)},${m0y.toFixed(2)} L${m1x.toFixed(2)},${m1y.toFixed(2)}`, "none", c.caution, 2));
      }
    }
  }
  return s;
}

/** Gauge number size by length (base px, before the 0.964 / 1.25 scale). */
export const numberBase = (len: number) => (len >= 5 ? 22 : len === 4 ? 28 : len === 3 ? 32 : 36);

// ---- the cluster (358 × 392) -------------------------------------------------
export const VW = 358;
const TX = 44;
const rb = 55;
const BZ = 62;
const GAP = 7;
export const SD = 0.964;
const X = [84, 274];
const gyT = TX + BZ;
const gyB = gyT + 180;
export const VH = gyB + BZ + TX;
const C0: [number, number] = [179, (gyT + gyB) / 2];
const KNOB = 36;
export const GAUGE_CENTRES: [number, number][] = [
  [X[0], gyT],
  [X[1], gyT],
  [X[0], gyB],
  [X[1], gyB],
];

const rad = (a: number) => (a * Math.PI) / 180;
const cP = (C: [number, number], r: number, a: number): [number, number] => [C[0] + r * Math.cos(rad(a)), C[1] + r * Math.sin(rad(a))];
const cF = (p: [number, number]) => p[0].toFixed(1) + "," + p[1].toFixed(1);
const polarReg = (C: [number, number], a0: number, a1: number, rout: (a: number) => number, n: number) => {
  const o: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    o.push(cP(C, rout(a), a));
  }
  return "M" + o.map(cF).join(" L") + " Z";
};
const rayCirc = (Q: [number, number], a: number, G: [number, number], Rr: number) => {
  const dx = Math.cos(rad(a));
  const dy = Math.sin(rad(a));
  const fx = Q[0] - G[0];
  const fy = Q[1] - G[1];
  const b = fx * dx + fy * dy;
  const cc = fx * fx + fy * fy - Rr * Rr;
  const ds = b * b - cc;
  if (ds < 0) return Infinity;
  const t = -b - Math.sqrt(ds);
  return t > 0 ? t : Infinity;
};
const rayBox = (Q: [number, number], a: number, x0: number, y0: number, x1: number, y1: number) => {
  const dx = Math.cos(rad(a));
  const dy = Math.sin(rad(a));
  let t = Infinity;
  if (dx > 1e-6) t = Math.min(t, (x1 - Q[0]) / dx);
  if (dx < -1e-6) t = Math.min(t, (x0 - Q[0]) / dx);
  if (dy > 1e-6) t = Math.min(t, (y1 - Q[1]) / dy);
  if (dy < -1e-6) t = Math.min(t, (y0 - Q[1]) / dy);
  return t;
};
export const ring = (x: number, y: number, r: number) => `M${x - r},${y} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 -${2 * r},0`;
const pct = (v: number, m: number) => ((v / m) * 100).toFixed(2) + "%";

export interface ControlGeometry {
  /** The control's region path. */
  d: string;
  lead: boolean;
  /** Stroke width of the rounding pass (2 × RND on the petals). */
  round: number;
  /** Icon centre, as % of the cluster. */
  x: string;
  y: string;
  /** Hit diameter. */
  hit: string;
  size: number;
  /** Decorative details drawn over the controls (knob detail line, icon disc, guide ticks). */
  details: { d: string; fill: string; stroke: string; sw: number; op: number; kind: "line" | "disc" | "knob" }[];
}

/**
 * The control regions: the lead knob (a super-ellipse, r 36 + 2.5·cos 4a) and
 * the concave petals between the gauges, in slots 180° / 270° / 0° / 90°
 * (four secondaries) or 180° / 0° (two).
 */
export function controlGeometry(secondaryCount: number, glowUrl: string): ControlGeometry[] {
  const out: ControlGeometry[] = [];
  const hitPx = (u: number) => `max(48px, ${(u / 3.58).toFixed(2)}cqw)`;
  const knobR = (a: number) => KNOB + 2.5 * Math.cos(rad(4 * a));
  out.push({
    d: polarReg(C0, 0, 360, knobR, 96),
    lead: true,
    round: 0,
    x: pct(C0[0], VW),
    y: pct(C0[1], VH),
    hit: hitPx(76),
    size: 30,
    details: [{ d: polarReg(C0, 0, 360, (a) => knobR(a) - 7, 96), fill: "none", stroke: "acc", sw: 0.8, op: 0.45, kind: "knob" }],
  });
  const slots = secondaryCount === 4 ? [180, 270, 0, 90] : [180, 0];
  const BITE = BZ + 0.4 + GAP;
  const RND = 2.5;
  const RIN = KNOB + 2.5 + GAP + RND;
  const CAPR = 136 - RND;
  const SPANd = 45 - (((GAP / 2 + RND) / RIN) * 180) / Math.PI;
  for (let i = 0; i < secondaryCount; i++) {
    const m = slots[i];
    const ro = (an: number) =>
      Math.min(
        CAPR,
        rayBox(C0, an, 6, TX + 4, VW - 6, VH - TX - 4),
        ...GAUGE_CENTRES.map((g) => rayCirc(C0, an, g, BITE + RND)),
        rayCirc(C0, an, cP(C0, 125 + 62.5, m), 62.5)
      );
    const oP: [number, number][] = [];
    const iP: [number, number][] = [];
    for (let k = 0; k <= 220; k++) {
      const an = m - SPANd + (2 * SPANd * k) / 220;
      const r1 = ro(an);
      if (r1 - RIN < 1.2) continue;
      oP.push(cP(C0, r1, an));
      iP.push(cP(C0, RIN, an));
    }
    const d0 = "M" + oP.map(cF).join(" L") + " L" + iP.reverse().map(cF).join(" L") + " Z";
    const axO = ro(m);
    const icR = (RIN + axO) / 2;
    const p0 = cP(C0, icR, m);
    const details: ControlGeometry["details"] = [
      { d: `M${p0[0] - 18},${p0[1]} a18,18 0 1,0 36,0 a18,18 0 1,0 -36,0`, fill: glowUrl, stroke: "none", sw: 0, op: 1, kind: "disc" },
    ];
    const HG = 15;
    const e0 = RIN + 8;
    const e1 = axO - 8;
    const segL = icR - HG - e0;
    for (let k = 0; k < 10; k++) {
      const t0 = k / 10;
      const t1 = (k + 1) / 10;
      const op = 0.55 * Math.pow((k + 0.5) / 10, 0.9);
      details.push({ d: "M" + cF(cP(C0, e0 + segL * t0, m)) + " L" + cF(cP(C0, e0 + segL * t1, m)), fill: "none", stroke: "acc", sw: 0.8, op, kind: "line" });
      details.push({ d: "M" + cF(cP(C0, e1 - segL * t0, m)) + " L" + cF(cP(C0, e1 - segL * t1, m)), fill: "none", stroke: "acc", sw: 0.8, op, kind: "line" });
    }
    out.push({ d: d0, lead: false, round: 2 * RND, x: pct(p0[0], VW), y: pct(p0[1], VH), hit: hitPx(50), size: 22, details });
  }
  return out;
}

/** The decor (dotted outer ring, gauge faces) and bezels, in cluster units. */
export function clusterChrome(c: DashPalette) {
  const decor: { d: string; fill: string; stroke: string; sw: number; dash: string }[] = [
    { d: ring(C0[0], C0[1], Math.hypot(X[1] - C0[0], gyT - C0[1])), fill: "none", stroke: c.track, sw: 1, dash: "1 5" },
  ];
  const bezels: { d: string; stroke: string; sw: number; op: number }[] = [];
  for (const [gx, gy] of GAUGE_CENTRES) {
    decor.push({ d: ring(gx, gy, rb), fill: c.face, stroke: "none", sw: 0, dash: "none" });
    decor.push({ d: ring(gx, gy, rb - 2), fill: "none", stroke: c.faceRing, sw: 4, dash: "none" });
    bezels.push(
      { d: ring(gx, gy, (rb + BZ) / 2), stroke: c.bezel, sw: BZ - rb, op: 1 },
      { d: ring(gx, gy, rb), stroke: c.outline, sw: 1.2, op: 1 },
      { d: ring(gx, gy, BZ), stroke: c.outline, sw: 0.8, op: 0.55 }
    );
  }
  return { decor, bezels };
}

/** Where gauge i's label edge sits (top gauges above, bottom gauges below), as % of the cluster height. */
export function labelEdge(i: number) {
  const [, gy] = GAUGE_CENTRES[i];
  const top = i < 2;
  return { top, y: pct(top ? gy - BZ - 10 : gy + BZ + 10, VH) };
}

/** Gauge transform inside the cluster (contents drawn at 0.964 around the centre). */
export function gaugeTransform(i: number) {
  const [gx, gy] = GAUGE_CENTRES[i];
  return `translate(${(gx - 75 * SD).toFixed(2)},${(gy - 46 * SD).toFixed(2)}) scale(${SD.toFixed(3)})`;
}

export const gaugeCentrePct = (i: number) => ({ x: pct(GAUGE_CENTRES[i][0], VW), y: pct(GAUGE_CENTRES[i][1], VH) });
