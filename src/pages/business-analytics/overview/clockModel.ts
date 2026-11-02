// AN1 · the Live now day clock, ported from the handoff's own logic
// (BizAnalyticsV45.dc.html renderVals, template l.37-160, logic l.627-842).
// Pure: geometry, lanes, the readout fit, the indicator, the panel rows and
// the summary are computed here from today's items and the clock state; the
// component (DayClock.tsx / LiveNowCard.tsx) only draws them.
//
// Picked options (recorded): indicator c. Arc (D-BU4-3), leaf hour hand M
// (leaf 37, line 1.1; D-BU4-4), bezel "main" 3 (D-BU4-5), a true 24-hour
// face only when the user picks 24 on the 12/24 pill (D5; default 12-hour).
// Motion values from the source (V6-106): where SPEC prose and the markup
// disagree, the markup wins (ring 3.5 s, face blend 600 ms, pill 200 ms,
// auto-cycle 320 ms, no outgoing fade, reduced motion instant).

import { t, tn, tx } from "../../../i18n/core";

export interface ClockItem {
  /** Stable key (class id or event id); selection is by key, not title. */
  key: string;
  /** Start / end in hours of the day (18.5 = 6:30 PM). */
  s: number;
  e: number;
  /** "HH:MM" start / end. */
  ss: string;
  es: string;
  t: string;
  /** Instructor first name for a class (null: none assigned). */
  who: string | null;
  bk: number;
  cap: number;
  ev: boolean;
  loc: string | null;
  /** business_classes.id for a class row (opens the session page). */
  classId?: string;
}

export interface ClockColours {
  dark: boolean;
  hc: boolean;
  ink: string;
  inkSoft: string;
  faint: string;
  tert: string;
  divider: string;
  soft: string;
  pale: string;
  pDark: string;
  good: string;
  /** Class / event arc colours (CLS / EVC). */
  cls: string;
  evc: string;
  /** "+N" tab fills (classes / all events). */
  tabCls: string;
  tabEv: string;
}

export interface ClockInput {
  items: ClockItem[];
  /** Hours of the day now (18.0833 = 6:05 PM). */
  now: number;
  c: ClockColours;
  is24: boolean;
  /** Face blend 0 (12-hour) … 1 (24-hour). */
  blend: number;
  /** The viewed half (null: the current one). */
  halfPM: boolean | null;
  /** Auto-cycle / swipe index state. */
  cyc: number;
  /** Selected item key (arc tap / readout tap). */
  selKey: string | null;
  swX: number;
  anim: boolean;
  dir: 1 | -1;
  panelOpen: boolean;
  /** Text scale (Larger text: 1.15, AN1-120). */
  ts: number;
  isStore: boolean;
  /** New business: no classes at all (AN1-061). */
  isEmpty: boolean;
  /** "Next: Tue 6 Oct · Morning Mobility 6:30 AM" when nothing is on today (AN1-060). */
  emptyNext: string;
  reducedMotion: boolean;
  /** Width of a text at px / weight (canvas measureText); falls back to an estimate. */
  measure?: (t: string, px: number, weight: number) => number;
}

export interface Line {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  w: number;
  col: string;
}
export interface Num {
  px: string;
  py: string;
  t: string;
  fs: number;
  fw: number;
  col: string;
}
export interface ArcPaint {
  key: string;
  d: string;
  pd: string;
  pd2: string;
  col: string;
  selOp: number;
  trackOp: number;
  progOp: number;
  glowOp: number;
  cycOp: number;
  live: boolean;
  delay: number;
}
export interface Badge {
  key: string;
  d: string;
  lead: string;
  col: string;
  ink: string;
  t: string;
  px: string;
  py: string;
  name: string;
  live: boolean;
  pickKey: string;
}
export interface HandPath {
  d: string;
  fill: string;
  stroke: string;
  sw: number;
  op: number;
  /** Breathing glow (haloBreath) while something is live. */
  glow?: boolean;
  /** The drop shadow offset (translate 0.9, 1.3). */
  shadow?: boolean;
}
export interface ReadoutLayout {
  lines: { t: string; y: number }[];
  fs: number;
  lh: number;
  sub: string;
  subY: number;
  sfs: number;
  slh: number;
  logo: number;
  logoY: number;
  cfg: string;
  n: number;
}
export interface PanelRow {
  key: string;
  t: string;
  col: string;
  dg: string;
  live: boolean;
  st: string;
  stBg: string;
  stInk: string;
  when: string;
  bar: boolean;
  pct: number;
  bk: string;
  classId?: string;
}

export interface ClockModel {
  half: boolean;
  showPM: boolean;
  bzW: number;
  bzR: number;
  bzHiR: number;
  czU: number;
  ticks: Line[];
  nums: Num[];
  lanes: number[];
  arcs: ArcPaint[];
  badges: Badge[];
  conts: { d: string; col: string }[];
  showHand: boolean;
  handDeg: number;
  minDeg: number;
  hp: HandPath[];
  mp: HandPath[];
  live: boolean;
  nLive: number;
  cyc: number;
  glowStops: { o: number; a: number }[];
  /** Readout layers: current + next (swipe / auto-cycle). */
  layers: (ReadoutLayout & { off: number })[];
  maskW: number;
  maskStop: number;
  logo: { size: number; y: number; on: boolean };
  indicator: { kind: "none" } | { kind: "arc"; segs: { d: string; on: boolean }[] } | { kind: "count"; now: number; total: number };
  rdName: string;
  /** Item the readout tap / Enter selects. */
  tapKey: string | null;
  rows: PanelRow[];
  panelHead: string | null;
  summary: string;
  halfNote: string;
  otherHalf: number;
  amLabel: string;
  pmLabel: string;
  legend: { col: string; op: number; t: string }[];
}

const PXU = 268 / 300;
const CZ0 = 63;
const GROW = 4;
const LEAF =
  "M 924.4 540.2 C 926.11 544.37 926.54 548.91 927.36 553.32 C 928.8 561.08 929.64 568.79 930.21 576.66 C 932.57 609.13 928.13 641.02 919.55 672.37 C 900.23 742.92 853.48 804.05 791.15 841.94 C 762.82 859.17 731.28 870.42 699.1 877.86 C 671.76 884.17 643.4 886.13 615.4 885.89 C 599.01 885.74 582.63 884.09 566.25 883.7 C 566.74 879.3 573.64 875.44 576.68 872.48 C 585.82 863.59 595.64 855.43 605.29 847.11 C 629.02 826.66 654.39 808.89 681.66 793.45 C 701.82 782.04 723.43 773.62 742.6 760.39 C 763.68 745.83 782.03 727.79 798.39 708.19 C 806.05 699.02 812.91 689.21 819.35 679.16 C 821.27 676.16 827.01 670.04 826.4 666.35 C 798.14 691.54 767.08 713.92 733.26 731.05 C 709.64 743.01 684.5 751.2 660.56 762.34 C 647.16 768.59 634.45 775.89 621.94 783.74 C 616.43 787.2 611.29 791.99 605.4 794.73 C 604.25 787.79 606.72 779.53 607.79 772.64 C 610.87 752.86 616.43 733.37 624.06 714.85 C 633.07 692.95 645.38 671.69 660.94 653.77 C 685.28 625.73 718.1 605.13 753.57 594.39 C 790.66 583.15 829.86 581.2 866.79 569.6 C 880.33 565.35 893.47 559.72 905.7 552.51 C 911.91 548.86 917.8 542.94 924.4 540.2 Z";

/** "18:00" → "6:00 PM" (the source's f12). */
export function f12(s: string): string {
  const p = s.split(":").map(Number);
  return `${p[0] % 12 || 12}:${String(p[1]).padStart(2, "0")} ${p[0] >= 12 ? t("PM") : t("AM")}`;
}

export const hoursOf = (hhmm: string): number => {
  const [a, b] = hhmm.split(":").map(Number);
  return a + (b || 0) / 60;
};

/** "20 min", "1 h 52 min". */
export const fmtMin = (mn: number): string => (mn >= 60 ? t("{h} h {m} min", { h: Math.floor(mn / 60), m: mn % 60 }) : t("{n} min", { n: mn }));

const hexA = (hx: string, a: number): string => {
  if (!hx.startsWith("#")) return hx.replace(/^rgb\(var\((--[\w-]+)\)\)$/, `rgb(var($1) / ${a})`);
  const n = parseInt(hx.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const estimate = (t: string, px: number, wt: number) => t.length * px * (wt === 800 ? 0.62 : 0.56);

export const TEAL_LIGHT = "#14A08F";
export const TEAL_DARK = "#4FD1C0";

export function buildClock(o: ClockInput): ClockModel {
  const { c, now: NOW } = o;
  const dark = c.dark;
  const measureRaw = o.measure ?? estimate;
  const mc = new Map<string, number>();
  // The source subtracts its -0.01em tracking from 800 text and pads by 1.
  const MW = (t: string, px: number, wt: number) => {
    const k = `${wt}|${px}|${t}`;
    const hit = mc.get(k);
    if (hit != null) return hit;
    let w = measureRaw(t, px, wt);
    if (wt === 800) w -= 0.01 * px * Math.max(0, t.length - 1);
    mc.set(k, w + 1);
    return w + 1;
  };

  // ---- items, lanes (MAXL 3, first free lane by start), overflow ----------------
  const items = o.items.slice().sort((a, b) => a.s - b.s || (a.ev ? 1 : 0) - (b.ev ? 1 : 0));
  const MAXL = 3;
  const laneEnd: number[] = [];
  const lane = new Map<ClockItem, number>();
  const over: ClockItem[] = [];
  for (const x of items) {
    let l = laneEnd.findIndex((e) => e <= x.s);
    if (l < 0 && laneEnd.length < MAXL) {
      l = laneEnd.length;
      laneEnd.push(0);
    }
    if (l < 0) {
      lane.set(x, -1);
      over.push(x);
    } else {
      laneEnd[l] = x.e;
      lane.set(x, l);
    }
  }

  const B = o.blend;
  const half = B < 0.5;
  const showPM = o.halfPM ?? NOW >= 12;
  const off = half ? (showPM ? 12 : 0) : 0;
  const SPH = half ? 12 : 24;
  const vis = (x: ClockItem) => !half || (x.e > off && x.s < off + 12);
  const clip = (x: ClockItem): [number, number] => [Math.max(x.s, off), Math.min(x.e, off + SPH)];
  const BZW = 3;
  const BZO = 140.4 + BZW;
  const LR = [92, 81, 70];
  const off12 = showPM ? 12 : 0;
  const angP = (hr: number) => (half ? ((hr - off12) / 12) * 360 - 90 : (hr / 24) * 360 - 90);
  const ang = (hr: number) => {
    const a24 = (hr / 24) * 360 - 90;
    let a12 = ((hr - off12) / 12) * 360 - 90;
    while (a12 - a24 > 180) a12 -= 360;
    while (a24 - a12 > 180) a12 += 360;
    return a12 * (1 - B) + a24 * B;
  };
  const pt = (r: number, deg: number): [number, number] => [150 + r * Math.cos((deg * Math.PI) / 180), 150 + r * Math.sin((deg * Math.PI) / 180)];
  const F2 = (p: [number, number]) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  const arcD = (r: number, h0: number, h1: number) => {
    const a0 = ang(h0);
    const a1 = ang(Math.max(h1, h0 + 0.02));
    return `M${F2(pt(r, a0))} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${F2(pt(r, a1))}`;
  };
  const CLS = c.cls;
  const EVC = c.evc;
  const T = (s: string) => (o.is24 ? s : f12(s));

  const onNow = items.filter((x) => x.s <= NOW && x.e > NOW);
  const nextUp = items.find((x) => x.s > NOW) ?? null;
  const liveSort = onNow.slice().sort((a, b) => a.s - b.s || (a.ev ? 1 : 0) - (b.ev ? 1 : 0));
  const nLive = liveSort.length;
  const cyc = nLive ? ((o.cyc % nLive) + nLive) % nLive : 0;
  const shown = nLive ? liveSort[cyc] : null;

  // ---- readout fit (AN1-110..120) ---------------------------------------------
  const TS = o.ts;
  type Rd = { t: string; sub: string };
  const rdOf = (x: ClockItem): Rd => ({ t: x.t, sub: x.ev ? t("Until {time}", { time: T(x.es) }) : t("{booked} / {capacity} booked", { booked: x.bk, capacity: x.cap }) });
  const baseRd: Rd = nLive
    ? rdOf(shown as ClockItem)
    : nextUp
      ? { t: nextUp.t, sub: t("Next · in {time}", { time: fmtMin(Math.round((nextUp.s - NOW) * 60)) }) }
      : items.length
        ? { t: t("All finished"), sub: t("{count} today", { count: items.length }) }
        : { t: t("Nothing scheduled"), sub: o.isEmpty ? t("Create a class") : "" };
  const LAD = [14, 12.5, 11.5, 11].map((x) => +(x * TS).toFixed(1));
  if (TS > 1.01) LAD.push(+Math.max(11, 11 * TS * 0.9).toFixed(1));
  const indK = nLive > 1 ? (nLive <= 8 ? "arc" : "dots") : "";
  const CF = [
    { logo: 11, sub: true, k: "A" },
    { logo: 8, sub: true, k: "B" },
    { logo: 0, sub: true, k: "C" },
    { logo: 0, sub: false, k: "D" },
  ];
  const part = (words: string[], n: number, lw: number[], fs: number): string[] | null => {
    let best: string[] | null = null;
    let bestS = 1e9;
    const rec = (i: number, k: number, acc: string[]) => {
      if (k === n - 1) {
        const t = words.slice(i).join(" ");
        if (!t) return;
        if (MW(t, fs, 800) > lw[k]) return;
        const lines = acc.concat([t]);
        const ws = lines.map((x) => MW(x, fs, 800));
        const s = Math.max(...ws) - Math.min(...ws);
        if (s < bestS) {
          bestS = s;
          best = lines;
        }
        return;
      }
      for (let j = i + 1; j <= words.length - (n - 1 - k); j++) {
        const t = words.slice(i, j).join(" ");
        if (MW(t, fs, 800) > lw[k]) break;
        rec(j, k + 1, acc.concat([t]));
      }
    };
    rec(0, 0, []);
    return best;
  };
  const fit = (rd: Rd, cfg: (typeof CF)[number], fs: number, g: number, maxN: number): ReadoutLayout | null => {
    const Rr = (CZ0 + g) * PXU;
    const Re = Rr - 8;
    const lh = +(fs * 1.2).toFixed(1);
    const sfs = +(10 * TS).toFixed(1);
    const slh = +(13 * TS).toFixed(1);
    const sg = +(3 * TS).toFixed(1);
    const indTop = indK === "arc" ? (56 + g) * Math.cos(Math.PI / 6) * PXU - 2 : indK === "dots" ? 31 : null;
    const bot = indTop != null ? indTop - 6 : Re;
    const top = -Re;
    const hasSub = cfg.sub && !!rd.sub;
    const words = String(rd.t).split(/\s+/).filter(Boolean);
    const ch = (y0: number, y1: number) => {
      const m = Math.max(Math.abs(y0), Math.abs(y1));
      return m >= Re ? 0 : 2 * Math.sqrt(Re * Re - m * m);
    };
    for (let n = 1; n <= Math.min(maxN, words.length); n++) {
      const blockH = n * lh + (hasSub ? sg + slh : 0);
      const logoH = cfg.logo ? cfg.logo + 6 : 0;
      const grpH = logoH + blockH;
      if (grpH > bot - top) break;
      const g0 = top + (bot - top - grpH) / 2;
      const by = g0 + logoH;
      if (cfg.logo && ch(g0, g0 + cfg.logo) < cfg.logo + 4) continue;
      let subY = 0;
      if (hasSub) {
        const sy0 = by + n * lh + sg;
        if (MW(rd.sub, sfs, 600) > ch(sy0, sy0 + slh)) continue;
        subY = sy0 + slh / 2;
      }
      const lw: number[] = [];
      for (let i = 0; i < n; i++) lw.push(ch(by + i * lh, by + (i + 1) * lh));
      const best = part(words, n, lw, fs);
      if (best)
        return {
          lines: (best as string[]).map((t, i) => ({ t, y: +(by + i * lh + lh / 2).toFixed(1) })),
          fs,
          lh,
          sub: hasSub ? rd.sub : "",
          subY: +subY.toFixed(1),
          sfs,
          slh,
          logo: cfg.logo,
          logoY: cfg.logo ? g0 + cfg.logo / 2 : 0,
          cfg: cfg.k,
          n,
        };
    }
    return null;
  };
  const solve = (rd: Rd, g: number): ReadoutLayout | null => {
    if (TS > 1.01) {
      for (const fs of LAD)
        for (const cfg of CF) {
          const r = fit(rd, cfg, fs, g, 3);
          if (r) return r;
        }
    } else {
      for (const cfg of CF)
        for (const fs of LAD) {
          const r = fit(rd, cfg, fs, g, 3);
          if (r) return r;
        }
    }
    return null;
  };
  const firstGrow = (rd: Rd): boolean => {
    if (TS > 1.01) {
      for (const fs of LAD) {
        for (const cfg of CF) if (fit(rd, cfg, fs, 0, 3)) return false;
        if (fit(rd, CF[3], fs, GROW, 3)) return true;
      }
      return true;
    }
    return !solve(rd, 0);
  };
  const all = [baseRd].concat(nLive > 1 ? liveSort.filter((x) => x !== shown).map(rdOf) : []);
  const g = all.some(firstGrow) ? GROW : 0;
  const emergency = (rd: Rd): ReadoutLayout => {
    for (let fs = Math.min(LAD[LAD.length - 1], 11); fs >= 9.5; fs -= 0.5) {
      const r = fit(rd, CF[3], fs, GROW, 4);
      if (r) return { ...r, cfg: "E" };
    }
    return (
      fit(rd, CF[3], 9.5, GROW, 6) ?? { lines: [{ t: rd.t, y: 0 }], fs: 9.5, lh: 11, sub: "", subY: 0, sfs: 10, slh: 13, logo: 0, logoY: 0, cfg: "E", n: 1 }
    );
  };
  const lay = (rd: Rd) => solve(rd, g) ?? emergency(rd);
  const czU = CZ0 + g;
  if (g) for (let i = 0; i < LR.length; i++) LR[i] += g;

  // ---- selection, panel --------------------------------------------------------
  const selItem = items.find((x) => x.key === o.selKey) ?? shown ?? nextUp ?? items[items.length - 1] ?? null;
  const ovl = (a: ClockItem, b: ClockItem) => a.s < b.e && b.s < a.e;
  const selList = selItem ? items.filter((x) => x === selItem || ovl(x, selItem)) : [];

  // ---- continuation chevrons (half view, AN1-141 / 142) -------------------------
  const conts: { d: string; col: string }[] = [];
  items
    .filter((x) => half && (lane.get(x) ?? -1) >= 0 && vis(x))
    .forEach((x) => {
      const r = LR[lane.get(x) as number];
      const mk = (deg: number, dir: number) => {
        const a = deg + dir * 5.5;
        const tip = pt(r, a);
        const b1 = pt(r - 3.2, a - dir * 3.2);
        const b2 = pt(r + 3.2, a - dir * 3.2);
        conts.push({ d: `M${F2(b1)} L${F2(tip)} L${F2(b2)}`, col: x.ev ? EVC : CLS });
      };
      if (x.s < off) mk(-90, -1);
      if (x.e > off + 12) mk(270, 1);
    });

  // ---- arcs ----------------------------------------------------------------------
  const arcs: ArcPaint[] = items
    .filter((x) => (lane.get(x) ?? -1) >= 0 && vis(x))
    .map((x, i) => {
      const [h0, h1] = clip(x);
      const r = LR[lane.get(x) as number];
      const past = x.e <= NOW;
      const on = x.s <= NOW && x.e > NOW;
      return {
        key: x.key,
        d: arcD(r, h0, h1),
        pd: on ? arcD(r, h0, Math.min(NOW, h1)) : "M0,0",
        pd2: on ? arcD(r, h0, h1) : "M0,0",
        col: x.ev ? EVC : CLS,
        selOp: selList.includes(x) && selItem === x ? 0.95 : 0,
        // O5 High contrast: future arcs at full strength.
        trackOp: past ? 0.26 : on ? 0.3 : c.hc ? 1 : 0.85,
        progOp: on ? 1 : 0,
        glowOp: on ? 0.22 : 0,
        cycOp: nLive > 1 && x === shown ? 0.34 : 0,
        live: on,
        delay: +(i * 0.06).toFixed(2),
      };
    });

  // ---- "+N" tabs (AN1-042 / 044 / 135) -------------------------------------------
  const overG = new Map<string, ClockItem[]>();
  over.filter(vis).forEach((x) => {
    const arr = overG.get(x.ss) ?? [];
    arr.push(x);
    overG.set(x.ss, arr);
  });
  const tabD = (deg: number, r0: number, r1: number, sp: number) => {
    const a0 = deg - sp;
    const a1 = deg + sp;
    return `M${F2(pt(r1, a0))} A${r1},${r1} 0 0 1 ${F2(pt(r1, a1))} L${F2(pt(r0, a1))} A${r0},${r0} 0 0 0 ${F2(pt(r0, a0))} Z`;
  };
  const badges: Badge[] = [...overG.entries()].map(([ss, grp]) => {
    let dg0 = ang(grp[0].s);
    const handA = ang(NOW);
    const dh = ((dg0 - handA + 540) % 360) - 180;
    if ((!half || (NOW >= off && NOW < off + 12)) && Math.abs(dh) < 14) dg0 = handA + (dh >= 0 ? 14 : -14);
    const p = pt(150, dg0);
    const allEv = grp.every((x) => x.ev);
    const live = grp.some((x) => x.s <= NOW && x.e > NOW);
    const tr = ang(grp[0].s);
    let lead = "M0,0";
    if (Math.abs(((tr - dg0 + 540) % 360) - 180) >= 0.5) {
      const q0 = pt(150, tr);
      const q1 = pt(150, dg0 + (tr > dg0 ? 9.5 : -9.5));
      const k0 = pt(BZO + 0.5, tr);
      const k1 = pt(BZO + 13.5, tr);
      lead = `M${F2(k0)} L${F2(k1)} M${F2(q0)} A150,150 0 0 ${tr > dg0 ? 0 : 1} ${F2(q1)}`;
    }
    return {
      key: ss,
      d: tabD(dg0, BZO, BZO + 14, 9.5),
      lead,
      col: allEv ? c.tabEv : c.tabCls,
      ink: dark ? "#0D0B1A" : "#FFFFFF",
      t: `+${grp.length}`,
      px: `${(p[0] / 3).toFixed(2)}%`,
      py: `${(p[1] / 3).toFixed(2)}%`,
      name: live ? t("{count} more at {time}, live", { count: grp.length, time: T(grp[0].ss) }) : t("{count} more at {time}", { count: grp.length, time: T(grp[0].ss) }),
      live,
      pickKey: grp[0].key,
    };
  });

  // ---- ticks and numbers ------------------------------------------------------------
  const ticks: Line[] = [];
  const nums: Num[] = [];
  const full24 = !half;
  const tertTick = c.hc ? (dark ? "#B8B3C7" : "#5B5349") : c.tert;
  for (let k = 0; k < (full24 ? 48 : 60); k++) {
    const hr = full24 ? k / 2 : off + k / 5;
    const hourT = full24 ? k % 2 === 0 : k % 5 === 0;
    const card = full24 ? k % 12 === 0 : k % 15 === 0;
    const r0 = card ? 129 : hourT ? 130.6 : 134;
    const a = angP(hr);
    const p0 = pt(r0, a);
    const p1 = pt(137, a);
    ticks.push({ x1: p0[0].toFixed(2), y1: p0[1].toFixed(2), x2: p1[0].toFixed(2), y2: p1[1].toFixed(2), w: card ? 2.4 : hourT ? 1.4 : 0.6, col: card ? c.ink : hourT ? c.inkSoft : tertTick });
  }
  const numR = o.is24 && !full24 ? 116 : 117;
  for (let k = 0; k < 12; k++) {
    const card = k % 3 === 0;
    const hr = full24 ? 2 * k : off + k;
    const p = pt(numR, angP(hr));
    const t = full24 ? String(hr) : o.is24 ? String(hr % 24).padStart(2, "0") : String(k || 12);
    const fs = card ? (full24 ? 16 : o.is24 ? 15 : 17) : 11.5;
    nums.push({ px: `${(p[0] / 3).toFixed(2)}%`, py: `${(p[1] / 3).toFixed(2)}%`, t, fs, fw: card ? 800 : 700, col: card ? (dark ? "#FFFFFF" : "#1A1612") : dark ? "#C9C4D6" : "#5B5349" });
  }
  const lanes = LR.slice(0, Math.min(Math.max(1, laneEnd.length), 3));

  // ---- hands (leaf M, minute hand) ------------------------------------------------------
  const LV = { L: 37, lw: 1.1, nd: 1.8 };
  const LGAP = 4.5;
  const liveOn = nLive > 0;
  const HT = dark ? "#2F9B90" : "#0E4A45";
  const HHi = dark ? "#A9EADF" : "#5FA79D";
  const HSh = dark ? "rgba(0,0,0,0.55)" : "rgba(15,40,38,0.22)";
  const LT = dark ? TEAL_DARK : TEAL_LIGHT;
  const FACE = dark ? "#1C1F28" : "#FFFFFF";
  const hdegL = (((ang(NOW) + 90) % 360) + 360) % 360;
  const rb = czU + LGAP;
  const Y = (r: number) => (150 - r).toFixed(2);
  const leaf = (() => {
    const tx = 566.25;
    const ty = 883.7;
    const bx = 924.4;
    const by = 540.2;
    const len = Math.hypot(tx - bx, ty - by);
    const th = Math.atan2(ty - by, tx - bx);
    const rot = -Math.PI / 2 - th;
    const s = LV.L / len;
    const cs = Math.cos(rot);
    const sn = Math.sin(rot);
    const tr = (x: number, y: number) => {
      const dx = (x - bx) * s;
      const dy = (y - by) * s;
      return [150 + dx * cs - dy * sn, 150 - rb + dx * sn + dy * cs];
    };
    const ns = (LEAF.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    let k = 0;
    const d = LEAF.replace(/-?\d+(\.\d+)?\s+-?\d+(\.\d+)?/g, () => {
      const p = tr(ns[k], ns[k + 1]);
      k += 2;
      return `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
    });
    return { d, tipR: rb + LV.L };
  })();
  const nearest = Math.min(
    ...Array.from({ length: 12 }, (_, q) => {
      const nd = ((((hdegL - q * 30) % 360) + 540) % 360) - 180;
      return Math.abs(nd) - (q % 3 === 0 ? 7.2 : 5.2);
    }),
  );
  const lineEnd = nearest < 0 ? 107.5 : 133.5;
  const JG = 1.2;
  const ND = LV.nd;
  const circle = (r: number, y: string) => `M${(150 - r).toFixed(2)},${y} a${r},${r} 0 1,0 ${(2 * r).toFixed(2)},0 a${r},${r} 0 1,0 -${(2 * r).toFixed(2)},0 Z`;
  const hp: HandPath[] = [
    { d: leaf.d, fill: "none", stroke: LT, sw: 6, op: liveOn ? 0.16 : 0, glow: liveOn },
    { d: leaf.d, fill: HSh, stroke: "none", sw: 0, op: 0.9, shadow: true },
    { d: leaf.d, fill: HT, stroke: dark ? "#7FD3C8" : HT, sw: dark ? 0.5 : 0, op: 1 },
    { d: `M150,${Y(rb + LV.L * 0.14)} L150,${Y(rb + LV.L * 0.82)}`, fill: "none", stroke: HHi, sw: 0.45, op: dark ? 0.55 : 0.5 },
    { d: `M150,${Y(leaf.tipR + JG)} L150,${Y(lineEnd - ND)}`, fill: "none", stroke: HSh, sw: LV.lw + 0.2, op: 0.8, shadow: true },
    { d: `M150,${Y(leaf.tipR + JG)} L150,${Y(lineEnd - ND)}`, fill: "none", stroke: HT, sw: LV.lw, op: 1 },
    { d: circle(ND, Y(lineEnd)), fill: FACE, stroke: HT, sw: 1, op: 1 },
    { d: circle(ND * 0.45, Y(lineEnd)), fill: HT, stroke: "none", sw: 0, op: 1 },
    { d: circle(4.2, Y(lineEnd)), fill: LT, stroke: "none", sw: 0, op: liveOn ? 0.22 : 0, glow: liveOn },
  ];
  const MR = 107;
  const MO0 = 131;
  const MO1 = 137;
  const seg2 = `M150,${Y(rb + 2)} L150,${Y(MR)} M150,${Y(MO0)} L150,${Y(MO1)}`;
  const mp: HandPath[] = [
    { d: seg2, fill: "none", stroke: HSh, sw: 1.9, op: 1, shadow: true },
    { d: seg2, fill: "none", stroke: HT, sw: 1.3, op: 1 },
    { d: `M149.62,${Y(rb + 4)} L149.62,${Y(MR - 3)}`, fill: "none", stroke: HHi, sw: 0.4, op: 0.55 },
    { d: circle(1.7, Y(MO1)), fill: FACE, stroke: HT, sw: 0.8, op: 1 },
  ];
  const minDeg = +(((NOW % 1) * 360) % 360).toFixed(2);
  const handDeg = +((((ang(NOW) + 90) % 360) + 360) % 360).toFixed(2);

  // ---- indicator (c. Arc, counter over 8) --------------------------------------------------
  let indicator: ClockModel["indicator"] = { kind: "none" };
  if (nLive >= 2) {
    if (nLive <= 8) {
      const R0 = 56 + g;
      const SPAN = 60;
      const GAPU = 3;
      const CAP = 1.2;
      const tot = (SPAN * Math.PI) / 180;
      const gg = GAPU / R0;
      const seg = (tot - (nLive - 1) * gg) / nLive;
      const a0 = Math.PI / 2 + tot / 2;
      const P = (a: number) => [150 + R0 * Math.cos(a), 150 + R0 * Math.sin(a)];
      const segs: { d: string; on: boolean }[] = [];
      for (let i = 0; i < nLive; i++) {
        const s0 = a0 - i * (seg + gg) - CAP / R0;
        const s1 = a0 - i * (seg + gg) - seg + CAP / R0;
        const p0 = P(s0);
        const p1 = P(s1);
        segs.push({ d: `M${p0[0].toFixed(2)},${p0[1].toFixed(2)} A${R0},${R0} 0 0 0 ${p1[0].toFixed(2)},${p1[1].toFixed(2)}`, on: i === cyc });
      }
      indicator = { kind: "arc", segs };
    } else indicator = { kind: "count", now: cyc + 1, total: nLive };
  }

  // ---- readout layers -----------------------------------------------------------------------
  const W = +(2 * czU * PXU).toFixed(1);
  const lb = lay(baseRd);
  const cur = o.anim ? -o.dir * W : o.swX;
  const dEff = o.anim ? o.dir : o.swX > 0 ? -1 : 1;
  const nbX = nLive > 1 ? liveSort[(((cyc + dEff) % nLive) + nLive) % nLive] : null;
  const layers: (ReadoutLayout & { off: number })[] = [{ ...lb, off: +cur.toFixed(1) }];
  if (nbX) layers.push({ ...lay(rdOf(nbX)), off: +(cur + dEff * W).toFixed(1) });
  const Rr = czU * PXU;
  const Re = Rr - 8;

  // ---- panel rows ------------------------------------------------------------------------------
  const isLive = (x: ClockItem) => x.s <= NOW && x.e > NOW;
  const stP = (x: ClockItem): [string, string, string] =>
    x.e <= NOW ? [tx("Done", "class status"), c.soft, c.faint] : x.s <= NOW ? [t("In progress"), dark ? "#192A20" : "#E3F3E9", c.good] : [t("In {time}", { time: fmtMin(Math.round((x.s - NOW) * 60)) }), c.pale, c.pDark];
  const selOrd = selList.slice().sort((a, b) => (isLive(b) ? 1 : 0) - (isLive(a) ? 1 : 0) || a.s - b.s || (a.ev ? 1 : 0) - (b.ev ? 1 : 0));
  const rows: PanelRow[] = selOrd.map((x) => {
    const [st, stBg, stInk] = stP(x);
    const col = x.ev ? EVC : CLS;
    const who = x.ev ? (x.loc ? t("Event · {place}", { place: x.loc }) : t("Event")) : x.who ? t("Class with {name}", { name: x.who }) : t("Class");
    return {
      key: x.key,
      t: x.t,
      col,
      dg: hexA(col, 0.28),
      live: isLive(x),
      st,
      stBg,
      stInk,
      when: `${t("{from} to {to}", { from: T(x.ss), to: T(x.es) })} · ${who}`,
      bar: !x.ev,
      pct: x.ev || x.cap <= 0 ? 0 : Math.round((x.bk / x.cap) * 100),
      bk: x.ev ? "" : t("{booked} of {capacity} booked", { booked: x.bk, capacity: x.cap }),
      classId: x.classId,
    };
  });

  // ---- summary -------------------------------------------------------------------------------------
  const restC = items.filter((x) => !x.ev && x.s > NOW);
  const summary = o.isStore
    ? tn(items.filter((x) => x.e > NOW).length, "{n} event left today", "{n} events left today")
    : restC.length
      ? `${tn(restC.length, "{n} class left today", "{n} classes left today")} · ${t("{booked} of {capacity} booked", { booked: restC.reduce((a, x) => a + x.bk, 0), capacity: restC.reduce((a, x) => a + x.cap, 0) })}`
      : o.emptyNext || (o.isEmpty ? t("Create a class and it appears on the dial.") : "");
  const otherHalf = half ? items.filter((x) => (showPM ? x.s < 12 : x.e > 12)).length : 0;

  const glowStops = [
    [0.6, 0],
    [0.6055, 0],
    [0.606, 1],
    [0.64, 0.72],
    [0.69, 0.46],
    [0.75, 0.26],
    [0.82, 0.12],
    [0.9, 0.045],
    [1, 0],
  ].map(([oo, k]) => ({ o: +(czU / 104 + ((oo - 0.6) / 0.4) * (1 - czU / 104)).toFixed(4), a: +((dark ? 0.45 : 0.6) * k).toFixed(3) }));

  return {
    half,
    showPM,
    bzW: BZW,
    bzR: +(140.4 + BZW / 2).toFixed(2),
    bzHiR: +(140.4 + BZW - 0.3).toFixed(2),
    czU,
    ticks,
    nums,
    lanes,
    arcs,
    badges,
    conts,
    showHand: !half || (NOW >= off12 && NOW < off12 + 12),
    handDeg,
    minDeg,
    hp,
    mp,
    live: nLive > 0,
    nLive,
    cyc,
    glowStops,
    layers,
    maskW: W,
    maskStop: +Math.max(70, (Re / Rr) * 100 - 1).toFixed(1),
    logo: { size: lb.logo || 11, y: +lb.logoY.toFixed(1), on: !!lb.logo },
    indicator,
    rdName: nLive > 1 ? t("Live now, {i} of {count}: {title}. Swipe to change, tap for details", { i: cyc + 1, count: nLive, title: shown ? shown.t : "" }) : t("Open details"),
    tapKey: (shown ?? nextUp)?.key ?? null,
    rows,
    panelHead: rows.length > 1 ? t("{count} at the same time", { count: rows.length }) : null,
    summary,
    halfNote: ((span: string) => (showPM === NOW >= 12 ? t("Now · {span}", { span }) : t("Viewing · {span}", { span })))(
      !half
        ? t("{from} to {to}", { from: "00:00", to: "24:00" })
        : o.is24
          ? showPM
            ? t("{from} to {to}", { from: "12:00", to: "24:00" })
            : t("{from} to {to}", { from: "00:00", to: "12:00" })
          : showPM
            ? t("noon to midnight")
            : t("midnight to noon"),
    ),
    otherHalf,
    amLabel: o.is24 ? "00–12" : t("AM"),
    pmLabel: o.is24 ? "12–24" : t("PM"),
    legend: o.isStore
      ? [
          { col: EVC, op: 1, t: t("Events") },
          { col: EVC, op: 0.3, t: tx("Done", "class status") },
        ]
      : [
          { col: CLS, op: 1, t: t("Classes") },
          { col: EVC, op: 1, t: t("Events") },
          { col: CLS, op: 0.3, t: tx("Done", "class status") },
        ],
  };
}
