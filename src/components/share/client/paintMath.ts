// Market + Share 3.0 · the export painter's pure maths (paintMath.test.ts):
// CSS shadow lists, CSS line boxes, word wrapping and the two backgrounds'
// geometry, so the canvas draws the DOM card's own layout (drawClientCard).

export interface PaintShadow {
  x: number;
  y: number;
  blur: number;
  color: string;
}

/** Splits on commas outside parentheses. */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/**
 * A CSS text-shadow / drop-shadow list, either as authored ("0 1px 2px
 * rgba(0,0,0,0.55), ...") or as computed ("rgba(0, 0, 0, 0.55) 0px 1px 2px,
 * ..."). "none" is an empty list.
 */
export function parseShadows(css: string | null | undefined): PaintShadow[] {
  if (!css || css.trim() === "none") return [];
  return splitTop(css).map((part) => {
    const color = part.match(/(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|\b[a-z]+\b(?!\())/)?.[0] ?? "rgba(0,0,0,1)";
    const nums = part
      .replace(color, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => parseFloat(t));
    return { x: nums[0] || 0, y: nums[1] || 0, blur: nums[2] || 0, color };
  });
}

/**
 * Where a single line's baseline sits in a CSS line box: the half-leading
 * over the font's ascent and descent (Blink lays text out on whole-pixel
 * ascent and descent).
 */
export function baselineY(top: number, lineHeight: number | null, ascent: number, descent: number): number {
  const content = ascent + descent;
  const lh = lineHeight ?? content;
  return top + (lh - content) / 2 + ascent;
}

/** A computed line-height ("normal" or "13.11px") as px, or null for normal. */
export const lineHeightPx = (v: string): number | null => (v === "normal" ? null : parseFloat(v) || null);

/** Greedy word wrap to `width`, as the browser wraps a block of text. */
export function wrapWords(text: string, width: number, measure: (s: string) => number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && measure(next) > width + 0.5) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

/** A corner radius in px, clamped as CSS does (999px on a 64 box is 32). */
export const clampRadius = (r: number, w: number, h: number) => Math.max(0, Math.min(r, w / 2, h / 2));

/** The CSS gradient line for an angle (0deg = to top, clockwise) over a W × H box: start and end points. */
export function cssGradientLine(deg: number, W: number, H: number): [number, number, number, number] {
  const a = (deg * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const len = Math.abs(W * dx) + Math.abs(H * dy);
  return [W / 2 - (dx * len) / 2, H / 2 - (dy * len) / 2, W / 2 + (dx * len) / 2, H / 2 + (dy * len) / 2];
}

/** "#5F6878" + alpha byte ("2E") → rgba(), for the identity pattern's tints. */
export function hexAlpha(hex: string, alphaByte: string): string {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.round((parseInt(alphaByte, 16) / 255) * 1000) / 1000})`;
}
