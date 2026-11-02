// Market + Share 3.0 · the B-SH card export (HANDOVER §12: drawn client-side,
// 1080 wide; Story 1080×1920, Post 1080×1350, the sticker 1080×1920 with no
// background). The export is measured from the card's own DOM: an unscaled
// copy of BizCard (300 wide) is laid out off screen, and every box, rule,
// chip, image, mark, leaf, QR and line of text is drawn at the position the
// browser gave it, so the PNG matches the preview line for line (wraps,
// ellipses, the week's chips) without a second layout to keep in sync.
//
// Text: one Range per word groups the words into the browser's lines; each
// line is drawn with the element's own font, letter-spacing, colour,
// opacity, uppercase and text-shadows, on the baseline the line box gives
// (top + half the leading + the font's ascent). Canvas shadows are in device
// px, so their offsets and blurs are multiplied by the drawing scale.
//
// Images (the logo, the showcase photo) are fetched as blobs (CORS) so the
// canvas stays exportable; one that can't be read is left out (the logo
// tile keeps its fill and border), never replaced with anything made up.
// Photos stay on the device: nothing here uploads.

import { MARK_C_PATH, MARK_LEAF_PATH } from "../../icons/CentiumMark";
import { qrRows } from "../ShareQr";
import { photoRect, type OverlayTransform, type PhotoCrop, type Size } from "../overlayModel";
import { CARD_LEAF_PATH } from "./bizArt";
import { CARD_W, EXPORT_W, exportH, type BizFormat } from "./bizCardModel";
import { loadArabicForCanvas } from "../../../i18n/fonts";

type Ctx = CanvasRenderingContext2D;

interface Paint {
  /** Device px per card px (for shadows, which canvas keeps in device space). */
  px: number;
  images: Map<string, ImageBitmap | null>;
  qr: Map<string, boolean[][] | null>;
}

const MARK_VB = { x: 279.1, y: 180.1, w: 652, h: 706 };
const LEAF_VB = { w: 510, h: 915 };

const transparent = (c: string) => !c || c === "transparent" || /rgba\([^)]*,\s*0\)$/.test(c.replace(/\s+/g, " ").trim());

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** "rgba(0, 0, 0, 0.55) 0px 1px 2px, ..." → parts (color, x, y, blur). */
export function parseShadows(v: string): { color: string; x: number; y: number; blur: number }[] {
  if (!v || v === "none") return [];
  return v
    .split(/,(?![^(]*\))/)
    .map((part) => {
      const color = /(rgba?\([^)]*\)|#[0-9a-f]{3,8})/i.exec(part)?.[1] ?? "rgba(0,0,0,0.5)";
      const nums = part.replace(color, "").match(/-?[\d.]+px/g)?.map((n) => parseFloat(n)) ?? [];
      return { color, x: nums[0] ?? 0, y: nums[1] ?? 0, blur: nums[2] ?? 0 };
    });
}

async function loadBitmap(url: string): Promise<ImageBitmap | null> {
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) return null;
    return await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
}

/** What the card needs before drawing: its fonts, images and QR modules. */
async function prepare(root: HTMLElement): Promise<Pick<Paint, "images" | "qr">> {
  const images = new Map<string, ImageBitmap | null>();
  const qr = new Map<string, boolean[][] | null>();
  const jobs: Promise<unknown>[] = [];
  root.querySelectorAll<HTMLImageElement>('img[data-paint="img"]').forEach((img) => {
    const src = img.currentSrc || img.src;
    if (src && !images.has(src)) {
      images.set(src, null);
      jobs.push(loadBitmap(src).then((b) => images.set(src, b)));
    }
  });
  root.querySelectorAll<SVGElement>('[data-paint="qr"]').forEach((el) => {
    const v = el.getAttribute("data-qr");
    if (v && !qr.has(v)) {
      qr.set(v, null);
      jobs.push(qrRows(v).then((rows) => qr.set(v, rows)));
    }
  });
  // Every face the card uses, loaded with the text it draws.
  const fonts = new Set<string>();
  let text = "";
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim())) return;
    const cs = getComputedStyle(el);
    fonts.add(`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`);
    text += el.textContent ?? "";
  });
  await document.fonts.ready;
  jobs.push(...[...fonts].map((f) => document.fonts.load(f).catch(() => [])));
  jobs.push(loadArabicForCanvas(fonts, text));
  await Promise.all(jobs);
  return { images, qr };
}

function setShadow(ctx: Ctx, s: { color: string; x: number; y: number; blur: number } | null, px: number) {
  if (!s) {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    return;
  }
  ctx.shadowColor = s.color;
  ctx.shadowOffsetX = s.x * px;
  ctx.shadowOffsetY = s.y * px;
  ctx.shadowBlur = s.blur * px;
}

function drawPaths(ctx: Ctx, paths: string[], vb: { x: number; y: number; w: number; h: number }, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w / vb.w, h / vb.h);
  ctx.translate(-vb.x, -vb.y);
  ctx.fillStyle = "#FFFFFF";
  for (const d of paths) ctx.fill(new Path2D(d));
  ctx.restore();
}

/** The lines of one text node, as the browser broke them: [text, left, top, height]. */
function textLines(node: Text): { text: string; x: number; top: number; h: number }[] {
  const data = node.data;
  const range = document.createRange();
  const out: { text: string; x: number; top: number; h: number; start: number; end: number }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(data))) {
    range.setStart(node, m.index);
    range.setEnd(node, m.index + m[0].length);
    const r = range.getClientRects()[0];
    if (!r) continue;
    const last = out[out.length - 1];
    if (last && Math.abs(r.top - last.top) < 2) {
      last.end = m.index + m[0].length;
    } else {
      out.push({ text: "", x: r.left, top: r.top, h: r.height, start: m.index, end: m.index + m[0].length });
    }
  }
  range.detach();
  return out.map((l) => ({ text: data.slice(l.start, l.end), x: l.x, top: l.top, h: l.h }));
}

function fitEllipsis(ctx: Ctx, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(`${text.slice(0, mid).trimEnd()}…`).width <= max) lo = mid;
    else hi = mid - 1;
  }
  return `${text.slice(0, lo).trimEnd()}…`;
}

function paintText(ctx: Ctx, el: HTMLElement, cs: CSSStyleDeclaration, ox: number, oy: number, alpha: number, p: Paint) {
  const nodes = [...el.childNodes].filter((n): n is Text => n.nodeType === 3 && !!n.textContent?.trim());
  if (!nodes.length) return;
  ctx.save();
  ctx.font = `${cs.fontStyle === "italic" ? "italic " : ""}${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  (ctx as Ctx & { letterSpacing?: string }).letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
  ctx.fillStyle = cs.color;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  // Round G (EH3): each line at its own left edge, in the element's direction (Arabic lines read right to left).
  ctx.direction = cs.direction === "rtl" ? "rtl" : "ltr";
  ctx.globalAlpha = alpha;
  const shadows = parseShadows(cs.textShadow);
  const upper = cs.textTransform === "uppercase";
  const ellipsis = cs.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 0.5;
  const elLeft = el.getBoundingClientRect().left;
  for (const node of nodes) {
    for (const line of textLines(node)) {
      let text = upper ? line.text.toUpperCase() : line.text;
      if (ellipsis) text = fitEllipsis(ctx, text, el.clientWidth - (line.x - elLeft));
      const mt = ctx.measureText(text);
      const a = mt.fontBoundingBoxAscent;
      const d = mt.fontBoundingBoxDescent;
      const x = line.x - ox;
      const y = line.top - oy + (line.h - (a + d)) / 2 + a;
      for (const s of shadows) {
        setShadow(ctx, s, p.px);
        ctx.fillText(text, x, y);
      }
      setShadow(ctx, null, p.px);
      ctx.fillText(text, x, y);
    }
  }
  ctx.restore();
}

function paintElement(ctx: Ctx, el: Element, ox: number, oy: number, parentAlpha: number, p: Paint) {
  const cs = getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden") return;
  const alpha = parentAlpha * (parseFloat(cs.opacity) || 0);
  if (alpha <= 0) return;
  const r = el.getBoundingClientRect();
  const x = r.left - ox;
  const y = r.top - oy;
  const kind = el.getAttribute("data-paint");

  if (kind === "mark" || kind === "leaf") {
    ctx.save();
    ctx.globalAlpha = alpha;
    // An svg takes no text-shadow in CSS: the board's mark and leaf draw none.
    if (kind === "mark") drawPaths(ctx, [MARK_C_PATH, MARK_LEAF_PATH], MARK_VB, x, y, r.width, r.height);
    else drawPaths(ctx, [CARD_LEAF_PATH], { x: 0, y: 0, ...LEAF_VB }, x, y, r.width, r.height);
    ctx.restore();
    return;
  }
  if (kind === "qr") {
    const rows = p.qr.get(el.getAttribute("data-qr") ?? "") ?? null;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x, y, r.width, r.height);
    if (rows) {
      const n = rows.length;
      const m = r.width / n;
      ctx.fillStyle = "#241F1B";
      rows.forEach((row, yy) => row.forEach((dark, xx) => dark && ctx.fillRect(x + xx * m, y + yy * m, m * 1.02, m * 1.02)));
    }
    ctx.restore();
    return;
  }
  if (kind === "img") {
    const img = el as HTMLImageElement;
    const bmp = p.images.get(img.currentSrc || img.src) ?? null;
    if (bmp) {
      ctx.save();
      ctx.globalAlpha = alpha;
      roundRect(ctx, x, y, r.width, r.height, parseFloat(cs.borderTopLeftRadius) || 0);
      ctx.clip();
      // object-fit: cover, centred.
      const c = Math.max(r.width / bmp.width, r.height / bmp.height);
      const w = bmp.width * c;
      const h = bmp.height * c;
      ctx.drawImage(bmp, x + (r.width - w) / 2, y + (r.height - h) / 2, w, h);
      ctx.restore();
    }
    return;
  }

  // The box: fill (with its box-shadow), then borders.
  const radius = parseFloat(cs.borderTopLeftRadius) || 0;
  if (!transparent(cs.backgroundColor)) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const bs = parseShadows(cs.boxShadow)[0] ?? null;
    setShadow(ctx, bs, p.px);
    ctx.fillStyle = cs.backgroundColor;
    roundRect(ctx, x, y, r.width, r.height, radius);
    ctx.fill();
    ctx.restore();
  }
  const bt = parseFloat(cs.borderTopWidth) || 0;
  const bl = parseFloat(cs.borderLeftWidth) || 0;
  if (bt > 0 && bl > 0 && cs.borderTopStyle !== "none") {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = cs.borderTopColor;
    ctx.lineWidth = bt;
    roundRect(ctx, x + bt / 2, y + bt / 2, r.width - bt, r.height - bt, Math.max(0, radius - bt / 2));
    ctx.stroke();
    ctx.restore();
  } else if (bt > 0 && cs.borderTopStyle !== "none") {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = cs.borderTopColor;
    ctx.fillRect(x, y, r.width, bt);
    ctx.restore();
  }

  if (el instanceof HTMLElement) paintText(ctx, el, cs, ox, oy, alpha, p);
  for (const child of [...el.children]) paintElement(ctx, child, ox, oy, alpha, p);
}

/** linear-gradient(150deg, ...) over a w × h box, as CSS lays the gradient line. */
export function cssAngleGradient(ctx: Ctx, deg: number, w: number, h: number, stops: [number, string][]): CanvasGradient {
  const a = (deg * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const len = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
  const cx = w / 2;
  const cy = h / 2;
  const g = ctx.createLinearGradient(cx - (dx * len) / 2, cy - (dy * len) / 2, cx + (dx * len) / 2, cy + (dy * len) / 2);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/** "linear-gradient(150deg, #A 0%, #B 52%, #C 100%)" → its angle and stops. */
export function parseGradient(css: string): { deg: number; stops: [number, string][] } | null {
  const m = /linear-gradient\(\s*([\d.]+)deg\s*,(.*)\)\s*$/.exec(css);
  if (!m) return null;
  const parts = m[2].split(/,(?![^(]*\))/).map((s) => s.trim());
  const stops: [number, string][] = parts.map((s, i) => {
    const pm = /^(.*?)\s+([\d.]+)%$/.exec(s);
    return pm ? [parseFloat(pm[2]) / 100, pm[1]] : [parts.length > 1 ? i / (parts.length - 1) : 0, s];
  });
  return { deg: parseFloat(m[1]), stops };
}

/**
 * Paints a measured card (an unscaled BizCard's [data-card-root]) into ctx,
 * in card px (the caller sets the transform). `px` = device px per card px.
 * The root's background is painted from its CSS gradient unless `clear`.
 */
export async function paintCardRoot(ctx: Ctx, root: HTMLElement, px: number, clear: boolean, fill?: { w: number; h: number }): Promise<void> {
  const prep = await prepare(root);
  const p: Paint = { px, ...prep };
  const rr = root.getBoundingClientRect();
  if (!clear) {
    const bg = getComputedStyle(root).backgroundImage;
    const g = parseGradient(bg);
    if (g) {
      // The fill covers the whole export (the artboard's sub-pixel height leaves no unpainted row).
      const w = fill?.w ?? rr.width;
      const h = fill?.h ?? rr.height;
      ctx.save();
      ctx.fillStyle = cssAngleGradient(ctx, g.deg, w, h, g.stops);
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }
  const a = parseFloat(getComputedStyle(root).opacity) || 1;
  for (const child of [...root.children]) paintElement(ctx, child, rr.left, rr.top, a, p);
}

export function newCanvas(format: BizFormat): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_W;
  canvas.height = exportH(format);
  return canvas;
}

/** The card as its PNG canvas: Story / Post on their fill, the sticker transparent. */
export async function exportCard(root: HTMLElement, format: BizFormat, clear: boolean): Promise<HTMLCanvasElement> {
  const canvas = newCanvas(format);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D canvas context");
  const k = EXPORT_W / CARD_W;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(k, k);
  await paintCardRoot(ctx, root, k, clear, { w: canvas.width / k, h: canvas.height / k });
  ctx.restore();
  return canvas;
}

/**
 * "Your photo" (B-SH.5): the photo, cover-fit with the crop (photoRect, as
 * the editor shows it), then the transparent card layer at the editor's
 * transform, all scaled from the 220-wide editor frame to 1080.
 */
export async function exportPhotoCard(
  root: HTMLElement,
  format: "story" | "post",
  photo: ImageBitmap | HTMLImageElement,
  state: { transform: OverlayTransform; crop: PhotoCrop; layer: Size; frame: Size },
): Promise<HTMLCanvasElement> {
  const canvas = newCanvas(format);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D canvas context");
  const E = canvas.width / state.frame.w;
  const iw = "naturalWidth" in photo ? photo.naturalWidth : photo.width;
  const ih = "naturalHeight" in photo ? photo.naturalHeight : photo.height;
  const pr = photoRect({ w: iw, h: ih }, state.frame, state.crop);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height);
  ctx.clip();
  // The frame is 220 × 391 (Story) for a 1080 × 1920 export: the photo's
  // vertical scale is 1920 / 391 so it reaches the last row (391 × 1080 / 220 = 1919.45).
  const Ey = canvas.height / state.frame.h;
  ctx.drawImage(photo, pr.x * E, pr.y * Ey, pr.w * E, pr.h * Ey);
  ctx.restore();

  const rr = root.getBoundingClientRect();
  const t = state.transform;
  // The layer is drawn layer.w frame px wide at scale 1; the measured root is CARD_W.
  const s = (state.layer.w * t.scale * E) / rr.width;
  ctx.save();
  ctx.translate(t.x * E, t.y * E);
  ctx.rotate((t.rotation * Math.PI) / 180);
  ctx.scale(s, s);
  ctx.translate(-rr.width / 2, -rr.height / 2);
  await paintCardRoot(ctx, root, s, true);
  ctx.restore();
  return canvas;
}
