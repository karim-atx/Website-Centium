import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";

// MO1.2.1.5.2 #11: the hire-confirmed animation, v7 (the approved build;
// v8 "snake crawl" is removed, do not build). Spec:
// design-handover/v5.1/.../assets/animations/v7_spec.md and the board's motion
// strip: about 1.6 s on plain white, no glow.
//
//   0–400 ms     the check draws in, short arm to long arm, sharp (mitred) vertex
//   600–1100 ms  one continuous stroke morphs from the check to the C's arc
//                (25 % at 725, 50 % at 850, 75 % at 975, 100 % at 1100)
//   1100 ms      instant swap to the repo logo's C
//   1100–1500    the leaf scales up from its base with a slight unfurl
//   1500–1600    the title and details fade in (the parent, via onSettled)
//
// Stroke #8F68F6 (the spec's purple), butt-cut tips, constant width, easing
// cubic-bezier(.22,1,.36,1). Reduce motion shows the end frame.
//
// THE ASSET GAP, stated plainly: the spec asks for the C's own centre-line
// path, which is not in the repo (frame-check MO1.2.1.5.2 #11). The end frame
// is the repo logo itself (public/favicon.svg's two paths, copied below), and
// the morph's arc is a centre-line FITTED to that C (centre 620,530, radius
// 295 → 312 toward the bottom tip, width 115, tips at the C's cut ends), so
// the swap lands on the logo with a small, brief mismatch instead of the exact
// handover path. Colours: the C takes #8F68F6 so the swap has no colour flash
// (the PNG/SVG logo is #9C7FF8); the leaf is the repo logo's #8AC4BA.

const VIEWBOX = "202 130 812 812";
const C_PATH =
  "M 890.36 308.7 L 813.4 386.69 C 801.2 374.93 790.43 362.13 777.32 351.26 C 746.72 325.89 709.28 307.73 670.12 300.59 C 590.62 286.08 504.97 318.03 454.03 380.86 C 421.96 420.4 403.64 468.42 398.16 518.81 C 396.29 535.99 397.7 553.69 399.73 570.74 C 408.03 640.66 447.28 705.12 502.1 748.51 C 516.39 759.82 531.54 770.39 547.68 778.92 C 556.04 783.34 564.58 787.57 573.25 791.36 C 576.75 792.89 580.51 793.92 583.89 795.7 C 582.91 799.2 580.49 802.32 578.52 805.32 C 574.07 812.09 569.16 818.58 563.98 824.81 C 547.79 844.27 527.53 863.18 504.4 873.91 C 495.84 871.9 487.25 867.17 479.49 863.11 C 468.68 857.45 458.02 851.52 447.88 844.71 C 398.64 811.63 357.51 767.6 329.33 715.28 C 274.16 612.83 269.77 488.67 320.79 383.61 C 350.07 323.31 395.72 270.92 452.96 235.76 C 531.62 187.45 629.66 173.36 718.61 197.96 C 768.79 211.85 814.51 236.71 853.78 270.8 C 862.68 278.52 871.13 286.81 879.12 295.47 C 882.92 299.59 887.6 303.81 890.36 308.7 Z";
const LEAF_PATH = "M 924.4 540.2 C 926.11 544.37 926.54 548.91 927.36 553.32 C 928.8 561.08 929.64 568.79 930.21 576.66 C 932.57 609.13 928.13 641.02 919.55 672.37 C 900.23 742.92 853.48 804.05 791.15 841.94 C 762.82 859.17 731.28 870.42 699.1 877.86 C 671.76 884.17 643.4 886.13 615.4 885.89 C 599.01 885.74 582.63 884.09 566.25 883.7 C 566.74 879.3 573.64 875.44 576.68 872.48 C 585.82 863.59 595.64 855.43 605.29 847.11 C 629.02 826.66 654.39 808.89 681.66 793.45 C 701.82 782.04 723.43 773.62 742.6 760.39 C 763.68 745.83 782.03 727.79 798.39 708.19 C 806.05 699.02 812.91 689.21 819.35 679.16 C 821.27 676.16 827.01 670.04 826.4 666.35 C 798.14 691.54 767.08 713.92 733.26 731.05 C 709.64 743.01 684.5 751.2 660.56 762.34 C 647.16 768.59 634.45 775.89 621.94 783.74 C 616.43 787.2 611.29 791.99 605.4 794.73 C 604.25 787.79 606.72 779.53 607.79 772.64 C 610.87 752.86 616.43 733.37 624.06 714.85 C 633.07 692.95 645.38 671.69 660.94 653.77 C 685.28 625.73 718.1 605.13 753.57 594.39 C 790.66 583.15 829.86 581.2 866.79 569.6 C 880.33 565.35 893.47 559.72 905.7 552.51 C 911.91 548.86 917.8 542.94 924.4 540.2 Z";

const PURPLE = "#8F68F6";
const LEAF = "#8AC4BA";
const STROKE = 115;
const N = 48;

type Pt = [number, number];

/** The check, long-arm end → vertex → short-arm end, with the vertex kept as a point. */
function checkPoints(): Pt[] {
  const longEnd: Pt = [860, 330];
  const vertex: Pt = [545, 700];
  const shortEnd: Pt = [370, 525];
  const lenLong = Math.hypot(vertex[0] - longEnd[0], vertex[1] - longEnd[1]);
  const lenShort = Math.hypot(shortEnd[0] - vertex[0], shortEnd[1] - vertex[1]);
  const nLong = Math.round(((N - 1) * lenLong) / (lenLong + lenShort));
  const nShort = N - 1 - nLong;
  const pts: Pt[] = [];
  for (let i = 0; i <= nLong; i++) {
    const t = i / nLong;
    pts.push([longEnd[0] + (vertex[0] - longEnd[0]) * t, longEnd[1] + (vertex[1] - longEnd[1]) * t]);
  }
  for (let i = 1; i <= nShort; i++) {
    const t = i / nShort;
    pts.push([vertex[0] + (shortEnd[0] - vertex[0]) * t, vertex[1] + (shortEnd[1] - vertex[1]) * t]);
  }
  return pts;
}

/** The C's centre-line, top tip → round the left → bottom tip, same point count. */
function arcPoints(): Pt[] {
  const cx = 620;
  const cy = 530;
  const from = (-38 * Math.PI) / 180;
  const to = (-256 * Math.PI) / 180;
  const pts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const a = from + (to - from) * t;
    const r = 295 + 17 * t;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

const CHECK = checkPoints();
const ARC = arcPoints();

const toPath = (pts: Pt[]) => `M ${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")}`;

/** cubic-bezier(.22,1,.36,1), solved for x by Newton's method. */
function ease(x: number): number {
  const p1x = 0.22, p1y = 1, p2x = 0.36, p2y = 1;
  const bx = (t: number) => 3 * (1 - t) * (1 - t) * t * p1x + 3 * (1 - t) * t * t * p2x + t * t * t;
  const by = (t: number) => 3 * (1 - t) * (1 - t) * t * p1y + 3 * (1 - t) * t * t * p2y + t * t * t;
  let t = x;
  for (let i = 0; i < 6; i++) {
    const dx = bx(t) - x;
    const d = 3 * (1 - t) * (1 - t) * p1x + 6 * (1 - t) * t * (p2x - p1x) + 3 * t * t * (1 - p2x);
    if (Math.abs(d) < 1e-6) break;
    t = Math.min(1, Math.max(0, t - dx / d));
  }
  return by(t);
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function HireConfirmedMark({ size = 132, onSettled }: { size?: number; onSettled?: () => void }) {
  const reduce = useReducedMotion();
  const [now, setNow] = useState(reduce ? 1600 : 0);
  const settledRef = useRef(false);
  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  useEffect(() => {
    if (reduce) {
      if (!settledRef.current) {
        settledRef.current = true;
        onSettledRef.current?.();
      }
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const elapsed = t - start;
      setNow(elapsed);
      if (elapsed >= 1500 && !settledRef.current) {
        settledRef.current = true;
        onSettledRef.current?.();
      }
      if (elapsed < 1600) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  const t = reduce ? 1600 : now;
  const swapped = t >= 1100;
  const draw = ease(clamp01(t / 400));
  const morph = clamp01((t - 600) / 500);
  const pts = morph === 0 ? CHECK : CHECK.map(([x, y], i) => [x + (ARC[i][0] - x) * morph, y + (ARC[i][1] - y) * morph] as Pt);
  const leaf = ease(clamp01((t - 1100) / 400));

  return (
    <svg
      width={size}
      height={size}
      viewBox={VIEWBOX}
      aria-hidden
      // Plain on the sheet body: white in light, the dark card in dark (no glow).
      style={{ display: "block", overflow: "visible" }}
    >
      {swapped ? (
        <path d={C_PATH} fill={PURPLE} />
      ) : (
        <path
          d={toPath(pts)}
          fill="none"
          stroke={PURPLE}
          strokeWidth={STROKE}
          strokeLinecap="butt"
          strokeLinejoin="miter"
          strokeMiterlimit={8}
          pathLength={1}
          // Drawn from the short arm's end toward the long arm's (the path
          // runs the other way), so the offset starts negative.
          strokeDasharray={1}
          strokeDashoffset={-(1 - draw)}
        />
      )}
      {swapped && leaf > 0 && (
        <path
          d={LEAF_PATH}
          fill={LEAF}
          style={{
            transformBox: "view-box",
            transformOrigin: "566px 884px",
            // Scales up from its base with a slight unfurl (a few degrees of turn).
            transform: `rotate(${(-14 * (1 - leaf)).toFixed(2)}deg) scale(${leaf.toFixed(3)})`,
          }}
        />
      )}
    </svg>
  );
}
