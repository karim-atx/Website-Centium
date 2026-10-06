// Colour maths for the theme generator (R20): sRGB <-> OKLab/OKLCH, WCAG
// contrast, and the Centium-to-theme mapping (Foundations 2.1 "Theme mapping
// rule": every lavender token maps to the theme primary, every teal token to
// the theme secondary, "at the same relative lightness and opacity").

export const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
};
export const rgbToHex = (rgb) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

const toLin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const fromLin = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

export function rgbToOklab([r, g, b]) {
  const [lr, lg, lb] = [toLin(r), toLin(g), toLin(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
/** OKLab to linear-free sRGB 0-255, unclamped (out-of-gamut values fall outside 0-255). */
export function oklabToRgbRaw([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    fromLin(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLin(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLin(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}
export const toOklch = (hex) => {
  const [L, a, b] = rgbToOklab(hexToRgb(hex));
  return [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
};
const inGamut = (rgb) => rgb.every((v) => v >= -0.5 && v <= 255.5);
/** OKLCH to hex, reducing chroma (hue and lightness held) until it fits sRGB. */
export function fromOklch([L, C, h]) {
  const rad = (h * Math.PI) / 180;
  let c = C;
  for (let i = 0; i < 60; i++) {
    const rgb = oklabToRgbRaw([L, c * Math.cos(rad), c * Math.sin(rad)]);
    if (inGamut(rgb)) return rgbToHex(rgb.map((v) => Math.min(255, Math.max(0, v))));
    c *= 0.93;
  }
  return rgbToHex(oklabToRgbRaw([L, 0, 0]).map((v) => Math.min(255, Math.max(0, v))));
}

export const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map(toLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
/** a at alpha over b, as hex. */
export const over = (a, alpha, b) => {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v * alpha + B[i] * (1 - alpha)));
};

/**
 * Shift lightness (hue and chroma held) toward black or white until `hex`
 * reaches `ratio` against every colour in `grounds`. Returns hex unchanged
 * when it already passes. dir: -1 darker, +1 lighter.
 */
export function ensureContrast(hex, grounds, ratio, dir) {
  const pass = (h) => grounds.every((g) => contrast(h, g) >= ratio);
  if (pass(hex)) return hex;
  const [L, C, H] = toOklch(hex);
  for (let step = 1; step <= 200; step++) {
    const nl = L + dir * step * 0.005;
    if (nl <= 0 || nl >= 1) break;
    const cand = fromOklch([nl, C, H]);
    if (pass(cand)) return cand;
  }
  return dir < 0 ? "#000000" : "#ffffff";
}

/**
 * The mapping: lightness re-scaled piecewise so the Centium anchor's lightness
 * lands on the theme anchor's (0 and 1 fixed), chroma scaled by the anchors'
 * ratio, hue rotated by the anchors' difference. The anchor maps to itself
 * exactly; every other shade keeps its place relative to it.
 */
export function makeMapper(fromAnchor, toAnchor) {
  const [, Cc, hc] = toOklch(fromAnchor);
  const [, Ct, ht] = toOklch(toAnchor);
  const ratio = Cc > 0.005 ? Ct / Cc : 1;
  // Same relative lightness, read as the same LUMINANCE as the Centium shade:
  // contrast depends on luminance alone, so every pairing of a mapped shade
  // with a fixed colour (greys, white, the dark surfaces) or with another
  // mapped shade keeps exactly the ratio it has in Centium. The theme's hue
  // and chroma come from its pair; lightness is solved for.
  return (hex) => {
    const [L, C, h] = toOklch(hex);
    const target = luminance(hex);
    const hue = (h + ht - hc + 360) % 360;
    const chroma = C * ratio;
    let lo = 0, hi = 1, best = fromOklch([L, chroma, hue]);
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const cand = fromOklch([mid, chroma, hue]);
      best = cand;
      if (luminance(cand) < target) lo = mid; else hi = mid;
    }
    // 8-bit rounding can move luminance by a percent or so, enough to tip a
    // 4.5:1 pairing under; take the neighbouring value whose luminance is
    // nearest the target.
    const [r0, g0, b0] = hexToRgb(best);
    let pick = best, err = Math.abs(luminance(best) - target);
    for (const dr of [-1, 0, 1]) for (const dg of [-1, 0, 1]) for (const db of [-1, 0, 1]) {
      const c = [r0 + dr, g0 + dg, b0 + db];
      if (c.some((v) => v < 0 || v > 255)) continue;
      const hx = rgbToHex(c);
      const e = Math.abs(luminance(hx) - target);
      if (e < err) { err = e; pick = hx; }
    }
    return pick;
  };
}
