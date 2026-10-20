// Release 3 · ProTrendRing geometry, literal from the handoff
// (source/gen/hub4.js G4, pol4, arc4, sector4, hAng; hub5.js ringData5,
// heroTrend5). Angles are degrees clockwise from 12 o'clock.

export const G = {
  c: 170,
  vb: 340,
  rDisc: 86,
  /** Trend bars r 97 to 129. */
  r0: 97,
  rM: 129,
  rDay: 143,
  rTi: 149,
  rTo: 154,
  rTm: 157,
  rHr: 166,
  rA0: 92,
  rA1: 155,
  span: 112,
  a0: 118,
  a1: 242,
  gap: 4,
} as const;

/** The Centium leaf at "now" on the calendar track (hub4.js LEAFD). */
export const LEAF_D =
  "M217 0C215.8 10.0 219.5 30.0 210 60C200.5 90.0 180.0 143.3 160 180C140.0 216.7 110.0 246.7 90 280C70.0 313.3 51.7 345.0 40 380C28.3 415.0 20.8 455.0 20 490C19.2 525.0 25.0 556.7 35 590C45.0 623.3 62.2 657.2 80 690C97.8 722.8 131.7 770.8 142 787C145.0 774.2 150.3 736.2 160 710C169.7 683.8 185.0 660.0 200 630C215.0 600.0 238.3 563.3 250 530C261.7 496.7 265.3 465.0 270 430C274.7 395.0 276.7 338.3 278 320C283.3 333.3 303.0 368.3 310 400C317.0 431.7 321.7 475.0 320 510C318.3 545.0 310.0 576.7 300 610C290.0 643.3 270.0 676.7 260 710C250.0 743.3 245.0 775.8 240 810C235.0 844.2 231.7 897.5 230 915C243.3 907.5 283.3 890.8 310 870C336.7 849.2 365.0 823.3 390 790C415.0 756.7 443.3 710.0 460 670C476.7 630.0 486.7 593.3 490 550C493.3 506.7 490.0 458.3 480 410C470.0 361.7 451.7 306.7 430 260C408.3 213.3 385.5 173.3 350 130C314.5 86.7 239.2 21.7 217 0Z";

const f1 = (n: number) => n.toFixed(1);

export function pol(r: number, a: number): [number, number] {
  const t = (a * Math.PI) / 180;
  return [G.c + r * Math.sin(t), G.c - r * Math.cos(t)];
}

const pt = (p: [number, number]) => `${f1(p[0])} ${f1(p[1])}`;

export function arc(r: number, a0: number, a1: number): string {
  return `M${pt(pol(r, a0))} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${pt(pol(r, a1))}`;
}

export function sector(r0: number, r1: number, a0: number, a1: number): string {
  return `M${pt(pol(r1, a0))} A${r1} ${r1} 0 0 1 ${pt(pol(r1, a1))} L${pt(pol(r0, a1))} A${r0} ${r0} 0 0 0 ${pt(pol(r0, a0))} Z`;
}

/** Bars: gap 0.9 when more than 14, else 2.2; seg fills the span. */
export function barLayout(n: number): { gap: number; seg: number } {
  const gap = n > 14 ? 0.9 : 2.2;
  return { gap, seg: (2 * G.span - gap * (n - 1)) / n };
}

export const barStart = (j: number, n: number) => {
  const { gap, seg } = barLayout(n);
  return -G.span + j * (seg + gap);
};
export const barMid = (j: number, n: number) => barStart(j, n) + barLayout(n).seg / 2;

/** Today: 7 AM at -span, 8 PM at +span. */
export function hourAngle(minutes: number): number {
  const fr = Math.max(0, Math.min(1, (minutes / 60 - 7) / 13));
  return -G.span + fr * 2 * G.span;
}

/** The four action sectors across the lower 124 degrees, 4 degree gaps (heroTrend5). Index 0 is the primary, drawn at the lower left. */
export function actionSectors(): { a0: number; a1: number; mid: number; ins: number }[] {
  const n = 4;
  const seg = (G.a1 - G.a0 - G.gap * (n - 1)) / n;
  const rm = (G.rA0 + G.rA1) / 2;
  const ins = ((3 / rm) * 180) / Math.PI;
  return Array.from({ length: n }, (_, j) => {
    const idx = n - 1 - j;
    const b0 = G.a0 + idx * (seg + G.gap);
    return { a0: b0, a1: b0 + seg, mid: (b0 + b0 + seg) / 2, ins };
  });
}

/** Angle (degrees, -180..180) and radius of a point in viewBox units. */
export function polarOf(x: number, y: number): { a: number; r: number } {
  const dx = x - G.c;
  const dy = G.c - y;
  return { a: (Math.atan2(dx, dy) * 180) / Math.PI, r: Math.hypot(dx, dy) };
}
