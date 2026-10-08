import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { CONFIRMATION_V6 } from "../../utils/assetUrls";
import { BRAND_C, BRAND_LEAF, MARK_C_PATH, MARK_LEAF_PATH } from "../icons/CentiumMark";

// v6 "Confirmation animation v6" (Part B animations/motion-specs.md; approved,
// ships on MO1.2.1.5.2 Hire confirmed at 124 px and HE1.9.2.1a Scan uploaded
// at 96 px). One shared component with a size prop (PB4 People).
//
//   GIF   animations/confirmation-v6/centium-confirmed-v6.gif, 480 x 480, 46
//         frames at 40 ms: 1.8 s of motion, then a 2.5 s hold on the final
//         frame; plays once. The crop window is centred on the mark (GIF x 165
//         to 314, y 110 to 271) and scaled proportionally only: the frame
//         draws the 480 GIF at 367.4 for the 124 crop (367.4 / 124 per px of
//         crop). Reduce motion: the static final frame
//         (keyframes/confirmed-v6-final.png) at the same crop.
//   SVG   V6-99 (accepted): the GIF has an opaque white ground, so it is
//         Centium light only. Dark mode and the four other themes draw a
//         frame-matched SVG rebuild instead, in the theme's own brand pair
//         (--c-brand-c / --c-brand-leaf) on the panel colour: the same
//         sequence and timings as the GIF ("stroke draws (0 s), check
//         complete (0.4 s), check becomes the C (0.9 s), leaf in place
//         (1.4 s), logo holds (1.8 s)"). The mark is placed by the CentiumMark
//         "ink" framing, which is exactly the GIF's crop window (the final
//         frame's C and leaf ink measure x 165 to 314, y 110 to 271), so the
//         two land on the same pixels. The check's centre line and width were
//         measured on keyframes 1 and 2 (short-arm end 189.5,192.5, vertex
//         224,226, long-arm end 294,152.5, about 24 px wide, in GIF pixels).
//
// `onSettled` fires when the motion ends (1.8 s; at once under Reduce
// motion): "the screen heading carries the text" and shows then.
// Each mount replays (a GIF decodes once per URL, so the src carries a
// per-mount key).

/** The GIF's crop window and the frame's drawn scale. */
const CROP = { x0: 165, x1: 314, y0: 110, y1: 271 };
const GIF_PER_CROP_PX = 367.4 / 124;
const MOTION_MS = 1800;

// The SVG rebuild, in the mark's own units (the "ink" framing viewBox).
const VIEW = { x: 285.1, y: 186.1, w: 645.6, h: 699.7 };
/** GIF pixel → mark units (the final frame's ink box onto the ink framing). */
const ux = (px: number) => VIEW.x + ((px - CROP.x0) * VIEW.w) / (CROP.x1 - CROP.x0 + 1);
const uy = (py: number) => VIEW.y + ((py - CROP.y0) * VIEW.h) / (CROP.y1 - CROP.y0 + 1);
const UNIT_PER_PX = VIEW.w / (CROP.x1 - CROP.x0 + 1);

type Pt = [number, number];
const N = 48;
const CHECK_WIDTH = 24 * UNIT_PER_PX;
const ARC_WIDTH = 115;

/** The check, long-arm end → vertex → short-arm end (drawn from the short end). */
function checkPoints(): Pt[] {
  const longEnd: Pt = [ux(294), uy(152.5)];
  const vertex: Pt = [ux(224), uy(226)];
  const shortEnd: Pt = [ux(189.5), uy(192.5)];
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

/** The C's centre line, top tip → round the left → bottom tip (fitted to MARK_C_PATH). */
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

/** cubic-bezier(.22,1,.36,1) (the app's easeBase), solved for x. */
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

let mountSeq = 0;

export function ConfirmedMark({
  size,
  onSettled,
  className,
}: {
  /** The crop box: 124 (MO1.2.1.5.2) or 96 (HE1.9.2.1a). */
  size: number;
  onSettled?: () => void;
  className?: string;
}) {
  const { colorTheme, theme } = useApp();
  const reduce = useReducedMotion();
  const gif = colorTheme === "centium" && theme !== "dark";
  const [key] = useState(() => ++mountSeq);
  const settled = useRef(false);
  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  // The SVG's clock (also the settle timer for the GIF).
  const [now, setNow] = useState(reduce ? MOTION_MS : 0);
  useEffect(() => {
    const settle = () => {
      if (settled.current) return;
      settled.current = true;
      onSettledRef.current?.();
    };
    if (reduce) {
      settle();
      return;
    }
    if (gif) {
      const id = window.setTimeout(settle, MOTION_MS);
      return () => window.clearTimeout(id);
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const elapsed = t - start;
      setNow(elapsed);
      if (elapsed >= MOTION_MS) settle();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce, gif]);

  if (gif) {
    const w = size * GIF_PER_CROP_PX;
    const k = w / 480;
    const cx = (CROP.x0 + CROP.x1 + 1) / 2;
    const cy = (CROP.y0 + CROP.y1 + 1) / 2;
    return (
      <span
        aria-hidden="true"
        data-confirmed-mark="gif"
        className={`relative block overflow-hidden shrink-0 ${className ?? ""}`}
        style={{ width: size, height: size }}
      >
        <img
          src={reduce ? CONFIRMATION_V6.final : `${CONFIRMATION_V6.gif}?play=${key}`}
          alt=""
          draggable={false}
          style={{ position: "absolute", width: w, height: w, maxWidth: "none", left: size / 2 - cx * k, top: size / 2 - cy * k }}
        />
      </span>
    );
  }

  const t = reduce ? MOTION_MS : now;
  const swapped = t >= 900;
  const draw = ease(clamp01(t / 400));
  const morph = ease(clamp01((t - 400) / 500));
  const pts = morph === 0 ? CHECK : CHECK.map(([x, y], i) => [x + (ARC[i][0] - x) * morph, y + (ARC[i][1] - y) * morph] as Pt);
  const leaf = ease(clamp01((t - 900) / 500));
  // The crop window's height fills the box, as the GIF's does (161 crop px
  // at 367.4 / 480 = 123.2 of 124).
  const h = (CROP.y1 - CROP.y0 + 1) * (GIF_PER_CROP_PX / 480) * size;
  const wSvg = (h * VIEW.w) / VIEW.h;
  return (
    <span
      aria-hidden="true"
      data-confirmed-mark="svg"
      className={`relative flex items-center justify-center shrink-0 ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <svg width={wSvg} height={h} viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} style={{ display: "block", overflow: "visible" }}>
        {swapped ? (
          <path d={MARK_C_PATH} fill={BRAND_C} />
        ) : (
          <path
            d={toPath(pts)}
            fill="none"
            stroke={BRAND_C}
            strokeWidth={CHECK_WIDTH + (ARC_WIDTH - CHECK_WIDTH) * morph}
            strokeLinecap="butt"
            strokeLinejoin="miter"
            strokeMiterlimit={8}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={-(1 - draw)}
          />
        )}
        {swapped && leaf > 0 && (
          <path
            d={MARK_LEAF_PATH}
            fill={BRAND_LEAF}
            style={{
              // Scales up from its base (the leaf's lower-left tip, 566,884)
              // with a slight unfurl.
              transformBox: "fill-box",
              transformOrigin: "0% 100%",
              transform: `rotate(${(-14 * (1 - leaf)).toFixed(2)}deg) scale(${leaf.toFixed(3)})`,
            }}
          />
        )}
      </svg>
    </span>
  );
}
