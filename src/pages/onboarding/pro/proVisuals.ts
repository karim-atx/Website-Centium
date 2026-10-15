// The professional lane's little drawings, as BizOnboardingV10.dc.html builds
// them: VIS.pro (the 20×20 lane chip, per specialty) and the status block's
// leaf (pending / approved fan / needs changes), as the shell's Shape objects.
//
// The three helpers are restated here rather than imported from
// shell/visuals.tsx: this file is reached from shell/lanes.ts, which the
// node:test project (tsconfig.test.json: no DOM, no JSX) also loads, and a
// .tsx import there fails the build. Same output as visuals' LF / RC / CI.
import type { ProKind } from "./proModel";

type Shape =
  | { k: "L"; t: string; f: string; o?: number }
  | { k: "R"; x: number; y: number; w: number; h: number; rx: number; f: string; s?: string; sw?: number; t?: string; o?: number }
  | { k: "C"; cx: number; cy: number; r: number; f: string; s?: string; sw?: number; o?: number };
const OB = { leaf: "var(--ob-leaf)", brand: "var(--ob-brand)", lav: "var(--ob-lav)", pale: "var(--ob-pale)", high: "var(--ob-high)" } as const;
const LF = (x: number, y: number, sc: number, r: number, f: string, o?: number): Shape => ({ k: "L", t: `translate(${x} ${y}) scale(${sc}) rotate(${r}) translate(-566 -884)`, f, o: o ?? 1 });
const RC = (x: number, y: number, w: number, h: number, rx: number, f: string): Shape => ({ k: "R", x, y, w, h, rx, f, o: 1 });
const CI = (cx: number, cy: number, r: number, f: string, o: { s?: string; sw?: number; o?: number } = {}): Shape => ({ k: "C", cx, cy, r, f, s: o.s, sw: o.sw, o: o.o ?? 1 });

export const PRO_CHIP_VIS: Record<ProKind, Shape[]> = {
  trainer: [RC(22, 60, 56, 5, 2.5, OB.lav), RC(16, 48, 9, 29, 3, OB.brand), RC(75, 48, 9, 29, 3, OB.brand), LF(50, 60, 0.07, -45, OB.leaf)],
  physio: [CI(36, 50, 13, "none", { s: OB.brand, sw: 5 }), CI(64, 50, 13, "none", { s: OB.lav, sw: 5 }), LF(50, 80, 0.07, -45, OB.leaf)],
  diet: [CI(50, 58, 30, "none", { s: OB.lav, sw: 4 }), CI(50, 58, 19, OB.pale), LF(46, 72, 0.075, -45, OB.leaf)],
  other: [CI(50, 52, 32, "none", { s: OB.lav, sw: 3 }), CI(50, 52, 21, "none", { s: OB.brand, sw: 3, o: 0.7 }), LF(50, 68, 0.07, -45, OB.leaf)],
  // Release 3: no new chip drawings were supplied; each reuses its nearest
  // lane's (Nutritionist the Dietitian plate, Coach the Trainer bar, Doctor
  // the Physiotherapist rings).
  nutritionist: [CI(50, 58, 30, "none", { s: OB.lav, sw: 4 }), CI(50, 58, 19, OB.pale), LF(46, 72, 0.075, -45, OB.leaf)],
  coach: [RC(22, 60, 56, 5, 2.5, OB.lav), RC(16, 48, 9, 29, 3, OB.brand), RC(75, 48, 9, 29, 3, OB.brand), LF(50, 60, 0.07, -45, OB.leaf)],
  doctor: [CI(36, 50, 13, "none", { s: OB.brand, sw: 5 }), CI(64, 50, 13, "none", { s: OB.lav, sw: 5 }), LF(50, 80, 0.07, -45, OB.leaf)],
};

/** Submitted / pending: the leaf in a faint ring. */
export const STATUS_PENDING_VIS: Shape[] = [LF(50, 82, 0.13, -45, OB.leaf), CI(50, 50, 40, "none", { s: OB.lav, sw: 1.5, o: 0.6 })];

/** Live / verified: the three-leaf fan, opened by `v` (0 closed, 1 open). */
export const statusFanVis = (v: number): Shape[] => [
  LF(50, 80, 0.12, 0, OB.leaf),
  LF(50, 80, 0.12, -45 * v, OB.lav),
  LF(50, 80, 0.12, -90 * v, OB.brand),
];

/** Needs changes: the leaf at half strength in an attention ring. */
export const STATUS_REJECTED_VIS: Shape[] = [LF(50, 82, 0.13, -45, OB.leaf, 0.5), CI(50, 50, 40, "none", { s: OB.high, sw: 1.5, o: 0.5 })];
