// Centium landing v29: the intro title's word motion and the leaf that is the
// dot of the i in "lives" (prototype `titleLift`, `titleIn`, `placeDot`,
// `dotMetrics`), ported literally. Shared by the loaders (eager) and the
// scroll engine (code-split), which re-places the dot on every measure.

import { clamp } from "../engine/math";

const words = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>("[data-tw]"));

/** LO1: the words lift from 10% as the leaf lands (prototype `titleLift`). */
export function titleLift(v: number, rm: boolean) {
  words().forEach((el, j, a) => {
    const k = clamp(v * (1 + (a.length - 1) * 0.12) - j * 0.12),
      e = 1 - Math.pow(1 - k, 3);
    el.style.transform = rm ? "none" : "translateY(" + ((1 - e) * 10).toFixed(2) + "%)";
  });
}

/** LO2 (and the end of any loader): the words rise in from 130% (prototype `titleIn`). */
export function titleIn(v: number, rm: boolean) {
  words().forEach((el, j, a) => {
    const k = clamp(v * (1 + (a.length - 1) * 0.09) - j * 0.09),
      e = 1 - Math.pow(1 - k, 3);
    if (rm) {
      el.style.transform = "none";
      el.style.opacity = k.toFixed(3);
    } else {
      el.style.transform = "translateY(" + ((1 - e) * 130).toFixed(2) + "%)";
      el.style.opacity = "";
    }
  });
}

interface DotMetrics {
  dx: number;
  dy: number;
  d: number;
  asc: number;
  ok: boolean;
}
const dmCache: Record<string, DotMetrics> = {};

/** Where the dot of an "i" sits in this font, measured by drawing "i" and the
 *  dotless "ı" and keeping the pixels only the first has (prototype `dotMetrics`).
 *  Arabic (C13): the same with "ز" and "ر", the same letter without its dot. */
export function dotMetrics(fs: number, fam: string, ar = false): DotMetrics {
  const key = fs.toFixed(2) + fam + (ar ? "ar" : "");
  const dotted = ar ? "ز" : "i",
    dotless = ar ? "ر" : "ı";
  if (dmCache[key]) return dmCache[key];
  const S = Math.ceil(fs * 2),
    cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const c = cv.getContext("2d", { willReadFrequently: true });
  const fallback = (asc: number): DotMetrics => ({ dx: fs * 0.13, dy: fs * 0.62, d: fs * 0.16, asc, ok: false });
  if (!c) return fallback(fs * 0.95);
  const ink = (ch: string) => {
    c.clearRect(0, 0, S, S);
    c.font = "800 " + fs + "px " + fam;
    c.textBaseline = "alphabetic";
    c.fillStyle = "#000";
    c.fillText(ch, fs * 0.5, fs * 1.4);
    return c.getImageData(0, 0, S, S).data;
  };
  const a = ink(dotted),
    b = ink(dotless);
  let x0 = 1e9,
    x1 = -1,
    y0 = 1e9,
    y1 = -1;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4 + 3;
      if (a[i] > 90 && b[i] < 40) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
    }
  c.font = "800 " + fs + "px " + fam;
  const m = c.measureText(dotless);
  const asc = m.fontBoundingBoxAscent || fs * 0.95;
  const r: DotMetrics =
    x1 < 0
      ? fallback(asc)
      : { dx: (x0 + x1 + 1) / 2 - fs * 0.5, dy: fs * 1.4 - (y0 + y1 + 1) / 2, d: Math.max(x1 - x0 + 1, y1 - y0 + 1), asc, ok: true };
  // Cached only once the face is really loaded: a measure taken on the
  // fallback font would otherwise stick (the prototype preloads Manrope, so
  // it never met this; here the dot is also re-placed on every measure).
  let ready = true;
  try {
    // With the letter itself, so Arabic waits for IBM Plex Sans Arabic, not Manrope.
    ready = !document.fonts || document.fonts.check("800 " + fs + "px " + fam, dotted);
  } catch {
    ready = true;
  }
  if (ready) dmCache[key] = r;
  return r;
}

export interface DotPlace {
  x: number;
  y: number;
  d: number;
  glyphDot: number;
  measured: boolean;
}

/** Sizes and places the leaf dot over the dotless i (prototype `placeDot`).
 *  Arabic (C13, data-ar on the wrap): over the ز in [data-zt], whose own dot
 *  is masked out of the glyph, so the leaf is the only dot. */
export function placeDot(wrap: HTMLElement | null, dot: HTMLElement | null): DotPlace | null {
  if (!wrap || !dot) return null;
  const ar = wrap.hasAttribute("data-ar"),
    zt = ar ? wrap.querySelector<HTMLElement>("[data-zt]") : null,
    tn = ar ? zt?.firstChild : wrap.firstChild;
  if (!tn || tn.nodeType !== 3) return null;
  const cs = getComputedStyle(wrap),
    fs = parseFloat(cs.fontSize),
    fam = cs.fontFamily,
    m = dotMetrics(fs, fam, ar);
  const rg = document.createRange();
  rg.selectNodeContents(tn);
  const rr = rg.getBoundingClientRect(),
    wr = wrap.getBoundingClientRect();
  if (!rr.width) return null;
  const L = m.d * 1.55,
    cx = rr.left + m.dx,
    cy = rr.top + m.asc - m.dy;
  if (zt) {
    // Only the font's dot is hidden (a circle of 0.62 times its size); the
    // letter and its shadda stay.
    const zr = zt.getBoundingClientRect(),
      R = m.d * 0.62,
      mask = `radial-gradient(circle at ${(cx - zr.left).toFixed(2)}px ${(cy - zr.top).toFixed(2)}px, transparent ${R.toFixed(2)}px, #000 ${(R + 0.8).toFixed(2)}px)`;
    zt.style.webkitMaskImage = mask;
    zt.style.maskImage = mask;
  }
  dot.style.left = (cx - wr.left - L / 2).toFixed(2) + "px";
  dot.style.top = (cy - wr.top - L / 2).toFixed(2) + "px";
  dot.style.width = L.toFixed(2) + "px";
  dot.style.height = L.toFixed(2) + "px";
  return { x: cx, y: cy, d: L, glyphDot: m.d, measured: m.ok };
}
