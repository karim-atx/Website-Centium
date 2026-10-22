import { METRIC_IDENTITY } from "../../../theme/marketTokens";
import { photoRect, toExport, type OverlayTransform, type PhotoCrop, type Size } from "../overlayModel";
import { CARD_W, EXPORT_K, exportSize, type ClientFormat, type IdentityKey } from "./clientCardModel";
import { baselineY, clampRadius, cssGradientLine, hexAlpha, lineHeightPx, parseShadows, wrapWords, type PaintShadow } from "./paintMath";

// Market + Share 3.0 · C-SH.3 / C-SH.4 / C-SH.5: the client card as a PNG,
// following the repo's drawShareCard rules (HANDOVER §12): drawn on the
// device at 1080 wide (Story and Sticker 1080 × 1920, Post 1080 × 1350),
// square corners and no card shadow (the PNG is the card), the Sticker with
// no background at all (alpha 0; the checkerboard is preview-only), nothing
// uploaded, no QR on client cards.
//
// Instead of a second, hand-made layout, the painter reads the DOM card's own
// layout: an unscaled 300-wide card (or the 100-wide photo layer) is mounted
// off screen, every element marked data-p is measured, and it is painted at
// k = 3.6 (or at the overlay transform for the photo layer). So a stat
// switched off leaves the preview and the export together, and the layer
// reflows the same way in both.

const FONT_FAMILY = "Manrope, sans-serif";

interface PaintCtx {
  ctx: CanvasRenderingContext2D;
  root: DOMRect;
  /** Canvas pixels per root px (shadows are not transformed by the canvas). */
  px: number;
  extents: Map<string, { ascent: number; descent: number }>;
}

const hasLetterSpacing = (ctx: CanvasRenderingContext2D) => "letterSpacing" in ctx;

function setSpacing(ctx: CanvasRenderingContext2D, ls: number) {
  if (hasLetterSpacing(ctx)) ctx.letterSpacing = `${ls}px`;
}

function measure(ctx: CanvasRenderingContext2D, text: string, ls: number): number {
  if (hasLetterSpacing(ctx)) {
    setSpacing(ctx, ls);
    return ctx.measureText(text).width;
  }
  return ctx.measureText(text).width + ls * [...text].length;
}

function fill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, ls: number) {
  if (hasLetterSpacing(ctx)) {
    setSpacing(ctx, ls);
    ctx.fillText(text, x, y);
    return;
  }
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + ls;
  }
}

function extent(p: PaintCtx, font: string) {
  const hit = p.extents.get(font);
  if (hit) return hit;
  p.ctx.font = font;
  setSpacing(p.ctx, 0);
  const m = p.ctx.measureText("Hg");
  const e = { ascent: Math.round(m.fontBoundingBoxAscent), descent: Math.round(m.fontBoundingBoxDescent) };
  p.extents.set(font, e);
  return e;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: [number, number, number, number]) {
  const [tl, tr, br, bl] = r.map((v) => clampRadius(v, w, h));
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

const radii = (cs: CSSStyleDeclaration): [number, number, number, number] => [
  parseFloat(cs.borderTopLeftRadius) || 0,
  parseFloat(cs.borderTopRightRadius) || 0,
  parseFloat(cs.borderBottomRightRadius) || 0,
  parseFloat(cs.borderBottomLeftRadius) || 0,
];

function rel(p: PaintCtx, el: Element) {
  const r = el.getBoundingClientRect();
  return { x: r.left - p.root.left, y: r.top - p.root.top, w: r.width, h: r.height };
}

/** Opacity of the element and its ancestors up to the root. */
function opacityOf(el: Element, root: Element): number {
  let o = 1;
  for (let n: Element | null = el; n && n !== root.parentElement; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity) || (getComputedStyle(n).opacity === "0" ? 0 : 1);
  return o;
}

function withShadow(p: PaintCtx, s: PaintShadow | null, draw: () => void) {
  const { ctx } = p;
  ctx.save();
  if (s) {
    ctx.shadowColor = s.color;
    ctx.shadowOffsetX = s.x * p.px;
    ctx.shadowOffsetY = s.y * p.px;
    ctx.shadowBlur = s.blur * p.px;
  }
  draw();
  ctx.restore();
}

function paintText(p: PaintCtx, el: HTMLElement, root: HTMLElement) {
  const { ctx } = p;
  const cs = getComputedStyle(el);
  const raw = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return;
  const text = cs.textTransform === "uppercase" ? raw.toUpperCase() : raw;
  const size = parseFloat(cs.fontSize);
  const font = `${cs.fontWeight} ${size}px ${FONT_FAMILY}`;
  const ls = cs.letterSpacing === "normal" ? 0 : parseFloat(cs.letterSpacing) || 0;
  const { ascent, descent } = extent(p, font);
  const lh = lineHeightPx(cs.lineHeight);
  const lineBox = lh ?? ascent + descent;
  const b = rel(p, el);
  const padL = parseFloat(cs.paddingLeft) || 0;
  const padR = parseFloat(cs.paddingRight) || 0;
  const padT = parseFloat(cs.paddingTop) || 0;
  const contentW = b.w - padL - padR;
  ctx.font = font;
  const lines = b.h > lineBox * 1.5 ? wrapWords(text, contentW, (s) => measure(ctx, s, ls)) : [text];
  const shadows = parseShadows(cs.textShadow);
  ctx.save();
  ctx.globalAlpha = opacityOf(el, root);
  ctx.fillStyle = cs.color;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  lines.forEach((line, i) => {
    const w = measure(ctx, line, ls);
    const align = cs.textAlign;
    const x = align === "center" ? b.x + padL + (contentW - w) / 2 : align === "right" || align === "end" ? b.x + b.w - padR - w : b.x + padL;
    const y = baselineY(b.y + padT + i * lineBox, lh, ascent, descent);
    if (shadows.length) for (const s of shadows) withShadow(p, s, () => fill(ctx, line, x, y, ls));
    else fill(ctx, line, x, y, ls);
  });
  ctx.restore();
}

function paintBox(p: PaintCtx, el: HTMLElement, root: HTMLElement) {
  const { ctx } = p;
  const cs = getComputedStyle(el);
  const b = rel(p, el);
  if (b.w <= 0 || b.h <= 0) return;
  ctx.save();
  ctx.globalAlpha = opacityOf(el, root);
  const clip = el.parentElement?.closest('[data-p="clip"]');
  if (clip && root.contains(clip)) {
    const c = rel(p, clip);
    ctx.beginPath();
    roundRect(ctx, c.x, c.y, c.w, c.h, radii(getComputedStyle(clip)));
    ctx.clip();
  }
  const r = radii(cs);
  ctx.beginPath();
  roundRect(ctx, b.x, b.y, b.w, b.h, r);
  ctx.fillStyle = cs.backgroundColor;
  ctx.fill();
  const bw = parseFloat(cs.borderTopWidth) || 0;
  if (bw > 0 && cs.borderTopStyle !== "none") {
    ctx.beginPath();
    roundRect(ctx, b.x + bw / 2, b.y + bw / 2, b.w - bw, b.h - bw, r.map((v) => Math.max(0, v - bw / 2)) as [number, number, number, number]);
    ctx.strokeStyle = cs.borderTopColor;
    ctx.lineWidth = bw;
    ctx.stroke();
  }
  ctx.restore();
}

function paintRule(p: PaintCtx, el: HTMLElement) {
  const cs = getComputedStyle(el);
  const bw = parseFloat(cs.borderTopWidth) || 0;
  if (!bw) return;
  const b = rel(p, el);
  p.ctx.fillStyle = cs.borderTopColor;
  p.ctx.fillRect(b.x, b.y, b.w, bw);
}

function loadSvg(el: SVGSVGElement, w: number, h: number): Promise<HTMLImageElement> {
  const clone = el.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(Math.max(1, Math.round(w))));
  clone.setAttribute("height", String(Math.max(1, Math.round(h))));
  clone.removeAttribute("style");
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("svg"));
    img.src = src;
  });
}

async function paintSvg(p: PaintCtx, el: SVGSVGElement, root: HTMLElement) {
  const b = rel(p, el);
  if (b.w <= 0 || b.h <= 0) return;
  const img = await loadSvg(el, b.w * p.px, b.h * p.px);
  const s = el.getAttribute("data-shadow");
  const parts = s ? s.split(",") : null;
  const shadow = parts && parts.length >= 4 ? { x: +parts[0], y: +parts[1], blur: +parts[2], color: parts.slice(3).join(",") } : null;
  p.ctx.save();
  p.ctx.globalAlpha = opacityOf(el, root);
  withShadow(p, shadow, () => p.ctx.drawImage(img, b.x, b.y, b.w, b.h));
  p.ctx.restore();
}

/** Waits for Manrope in every weight and size the element uses. */
async function loadFonts(root: HTMLElement) {
  await document.fonts?.ready;
  const wanted = new Map<string, string>();
  root.querySelectorAll<HTMLElement>('[data-p="t"]').forEach((el) => {
    const cs = getComputedStyle(el);
    const f = `${cs.fontWeight} ${parseFloat(cs.fontSize)}px ${FONT_FAMILY}`;
    wanted.set(f, (wanted.get(f) ?? "") + (el.textContent ?? ""));
  });
  await Promise.all([...wanted].map(([f, t]) => document.fonts?.load(f, t).catch(() => []) ?? Promise.resolve([])));
}

/** Paints every data-p element under `root`, in document order, in root px (the caller sets the transform). */
export async function paintDom(ctx: CanvasRenderingContext2D, root: HTMLElement, pxPerUnit: number): Promise<void> {
  await loadFonts(root);
  const p: PaintCtx = { ctx, root: root.getBoundingClientRect(), px: pxPerUnit, extents: new Map() };
  for (const el of Array.from(root.querySelectorAll<HTMLElement>("[data-p]"))) {
    const kind = el.getAttribute("data-p");
    if (kind === "t") paintText(p, el, root);
    else if (kind === "box") paintBox(p, el, root);
    else if (kind === "rule") paintRule(p, el);
    else if (kind === "svg") await paintSvg(p, el as unknown as SVGSVGElement, root);
  }
}

// ---------------------------------------------------------------------------
// Backgrounds

/** linear-gradient(150deg, #7D6BB5 0%, #66709F 52%, #4F7F78 100%) */
function paintBrand(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const g = ctx.createLinearGradient(...cssGradientLine(150, W, H));
  g.addColorStop(0, "#7D6BB5");
  g.addColorStop(0.52, "#66709F");
  g.addColorStop(1, "#4F7F78");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** idPal(): radial-gradient(85% 55% at 100% 0%, ink 0x2E 0%, transparent 62%), repeating-linear-gradient(135deg, ink 0x0F 0 2px, transparent 2px 13px), tint. In card px. */
function paintIdentity(ctx: CanvasRenderingContext2D, id: IdentityKey, W: number, H: number) {
  const [tint, ink] = METRIC_IDENTITY[id];
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, W, H);
  // The stripes: 2 px of ink at 0x0F every 13 px, along the 135deg gradient line.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  const [x0, y0, x1, y1] = cssGradientLine(135, W, H);
  const len = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  ctx.fillStyle = hexAlpha(ink, "0F");
  for (let t = 0; t < len; t += 13) {
    const cx = x0 + ux * t;
    const cy = y0 + uy * t;
    ctx.beginPath();
    // A band 2 px thick across the whole card, perpendicular to the gradient line.
    const px = -uy * (W + H);
    const py = ux * (W + H);
    ctx.moveTo(cx + px, cy + py);
    ctx.lineTo(cx - px, cy - py);
    ctx.lineTo(cx - px + ux * 2, cy - py + uy * 2);
    ctx.lineTo(cx + px + ux * 2, cy + py + uy * 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // The glow: an ellipse 85% × 55% at the top-right corner, ink 0x2E fading out by 62%.
  ctx.save();
  const rx = 0.85 * W;
  const ry = 0.55 * H;
  ctx.translate(W, 0);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, hexAlpha(ink, "2E"));
  g.addColorStop(0.62, hexAlpha(ink, "00"));
  g.addColorStop(1, hexAlpha(ink, "00"));
  ctx.fillStyle = g;
  ctx.fillRect(-W, 0, W, H / (ry / rx));
  ctx.restore();
}

/**
 * The card export: `source` is an unscaled (300-wide) ClientShareCard's root.
 * Story / Post / Sticker at 1080; the sticker stays transparent.
 */
export async function drawClientCard(canvas: HTMLCanvasElement, source: HTMLElement, format: ClientFormat): Promise<void> {
  const { w, h } = exportSize(format);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D canvas context");
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.scale(EXPORT_K, EXPORT_K);
  const H = h / EXPORT_K;
  const bg = source.getAttribute("data-bg");
  if (format !== "sticker") {
    if (bg === "I") paintIdentity(ctx, (source.getAttribute("data-id") as IdentityKey) || "workout", CARD_W, H);
    else paintBrand(ctx, CARD_W, H);
  }
  await paintDom(ctx, source, EXPORT_K);
  ctx.restore();
}

/**
 * The "Your photo" export (C-SH.5): the photo cover-fit with the crop
 * (photoRect, so it matches the editor), then the stats layer at the
 * overlay transform, both scaled from the 220-wide editor frame to 1080.
 */
export async function drawPhotoCard(
  canvas: HTMLCanvasElement,
  o: { format: "story" | "post"; photo: HTMLImageElement; crop: PhotoCrop; transform: OverlayTransform; frame: Size; layer: HTMLElement; layerSize: Size },
): Promise<void> {
  const { w, h } = exportSize(o.format);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D canvas context");
  const k = w / o.frame.w;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.scale(k, h / o.frame.h);
  const r = photoRect({ w: o.photo.naturalWidth || 1, h: o.photo.naturalHeight || 1 }, o.frame, o.crop);
  ctx.drawImage(o.photo, r.x, r.y, r.w, r.h);
  ctx.restore();
  const t = toExport(o.transform, o.frame.w, w);
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate((t.rotation * Math.PI) / 180);
  ctx.scale(t.scale, t.scale);
  ctx.translate(-o.layerSize.w / 2, -o.layerSize.h / 2);
  await paintDom(ctx, o.layer, t.scale);
  ctx.restore();
}

export const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
