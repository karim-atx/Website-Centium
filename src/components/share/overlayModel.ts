// Market + Share 3.0 · the overlay editor's maths (C-SH.5, P-SH.3 ADDED,
// B-SH.5), pure so the editor, the canvas exports and the tests share one
// definition. HANDOVER §12 and the screen files' ed.move:
// - the transform is { x, y, scale 0.5 to 2.0, rotation }, x / y the layer's
//   centre in frame px (the editor's 220-wide frame);
// - it snaps to the centre lines within 5 px;
// - it is clamped to a 10 px safe margin at frame scale (scaled up to the
//   export by toExport);
// - rotation snaps to 0 degrees (the threshold is not on the board, open
//   item 9: 5 degrees here);
// - the photo is cover-fit, zoomed to at least 100% and dragged within its
//   bounds.
// Persisted per draft only (the editor's state; nothing is stored).

import { SHARE_TOKENS } from "../../theme/marketTokens";

export const SAFE_MARGIN = SHARE_TOKENS.safeMargin;
export const SNAP_PX = 5;
export const SCALE_MIN = SHARE_TOKENS.scaleMin;
export const SCALE_MAX = SHARE_TOKENS.scaleMax;
/** Open item 9: the board says "snaps to 0°" only. */
export const ROTATE_SNAP_DEG = 5;
/** The crop's ceiling (not on the board; the drawn crop is 160%). */
export const CROP_MAX = 3;

/** The editor frame: 220 wide; Story 391, Post 275, Square 220 (the screen files' W / Hh). */
export const EDITOR_W = 220;
export function editorHeight(format: "story" | "post" | "square" | "sticker"): number {
  return format === "post" ? 275 : format === "square" ? 220 : 391;
}

export interface Size {
  w: number;
  h: number;
}

export interface OverlayTransform {
  x: number;
  y: number;
  scale: number;
  /** Degrees, -180 < r <= 180. */
  rotation: number;
}

/** The photo crop: zoom >= 1 and the focus point (object-position) in percent. */
export interface PhotoCrop {
  zoom: number;
  fx: number;
  fy: number;
}

export const DEFAULT_CROP: PhotoCrop = { zoom: 1, fx: 50, fy: 50 };

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const clampScale = (s: number) => clamp(Number.isFinite(s) ? s : 1, SCALE_MIN, SCALE_MAX);

/** -180 < r <= 180. */
export function normaliseDeg(r: number): number {
  let d = ((r % 360) + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

export function snapRotation(r: number): { rotation: number; snapped: boolean } {
  const d = normaliseDeg(r);
  return Math.abs(d) < ROTATE_SNAP_DEG ? { rotation: 0, snapped: true } : { rotation: d, snapped: false };
}

/** The layer's half extents in the frame, rotation included (its bounding box). */
export function halfExtents(layer: Size, scale: number, rotation: number): { hw: number; hh: number } {
  const a = (rotation * Math.PI) / 180;
  const c = Math.abs(Math.cos(a));
  const s = Math.abs(Math.sin(a));
  return { hw: ((layer.w * c + layer.h * s) * scale) / 2, hh: ((layer.w * s + layer.h * c) * scale) / 2 };
}

/** Keeps the layer inside the safe margin; a layer larger than the safe area centres on that axis. */
export function clampPosition(t: OverlayTransform, frame: Size, layer: Size): OverlayTransform {
  const { hw, hh } = halfExtents(layer, t.scale, t.rotation);
  const axis = (v: number, half: number, size: number) => {
    const lo = SAFE_MARGIN + half;
    const hi = size - SAFE_MARGIN - half;
    return lo > hi ? size / 2 : clamp(v, lo, hi);
  };
  return { ...t, x: axis(t.x, hw, frame.w), y: axis(t.y, hh, frame.h) };
}

/** ed.move's snap: within 5 px of a centre line, onto it. */
export function snapPosition(x: number, y: number, frame: Size): { x: number; y: number; v: boolean; h: boolean } {
  const v = Math.abs(x - frame.w / 2) < SNAP_PX;
  const h = Math.abs(y - frame.h / 2) < SNAP_PX;
  return { x: v ? frame.w / 2 : x, y: h ? frame.h / 2 : y, v, h };
}

/**
 * A drag: the start transform moved by (dx, dy) frame px, clamped then
 * snapped (ed.move: clamp, then snap). Snapping can't break the clamp: the
 * centre line is inside the safe area whenever the layer fits.
 */
export function dragTo(start: OverlayTransform, dx: number, dy: number, frame: Size, layer: Size): { t: OverlayTransform; v: boolean; h: boolean } {
  const c = clampPosition({ ...start, x: start.x + dx, y: start.y + dy }, frame, layer);
  const s = snapPosition(c.x, c.y, frame);
  return { t: { ...c, x: s.x, y: s.y }, v: s.v, h: s.h };
}

/** A pinch / rotate: scale clamped to 0.5 to 2.0, rotation snapped, then the position re-clamped. */
export function pinchTo(start: OverlayTransform, scaleBy: number, rotateBy: number, frame: Size, layer: Size): { t: OverlayTransform; snapped: boolean } {
  const scale = clampScale(start.scale * scaleBy);
  const r = snapRotation(start.rotation + rotateBy);
  return { t: clampPosition({ ...start, scale, rotation: r.rotation }, frame, layer), snapped: r.snapped };
}

/**
 * The default place (the screen files' presets): "corner" puts the layer at
 * scale 1 in the bottom-left corner on the safe margin (C-SH.5 ph1Default
 * x 60 y 333 for a 100 × 96 layer in 220 × 391; P-SH.3 yp1Default y 323);
 * "fill" centres it at scale 1 (B-SH.5 yDefault, the card filling the frame).
 */
export function defaultTransform(frame: Size, layer: Size, anchor: "corner" | "fill"): OverlayTransform {
  if (anchor === "fill") return { x: frame.w / 2, y: frame.h / 2, scale: 1, rotation: 0 };
  return clampPosition({ x: SAFE_MARGIN + layer.w / 2, y: frame.h - SAFE_MARGIN - layer.h / 2, scale: 1, rotation: 0 }, frame, layer);
}

export const sameTransform = (a: OverlayTransform, b: OverlayTransform) =>
  Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01 && Math.abs(a.scale - b.scale) < 0.001 && Math.abs(a.rotation - b.rotation) < 0.01;

export const sameCrop = (a: PhotoCrop, b: PhotoCrop) => Math.abs(a.zoom - b.zoom) < 0.001 && Math.abs(a.fx - b.fx) < 0.01 && Math.abs(a.fy - b.fy) < 0.01;

export function clampCrop(c: PhotoCrop): PhotoCrop {
  return { zoom: clamp(Number.isFinite(c.zoom) ? c.zoom : 1, 1, CROP_MAX), fx: clamp(c.fx, 0, 100), fy: clamp(c.fy, 0, 100) };
}

/**
 * Panning the photo by (dx, dy) frame px: the image follows the finger. With
 * photoRect's geometry the drawn left edge is fx% × (frame - drawn width), so
 * a drag of dx moves fx by -dx / overflow; an axis with no overflow doesn't
 * move. fx / fy stay 0 to 100, so the frame is always covered.
 */
export function panCrop(start: PhotoCrop, dx: number, dy: number, frame: Size, img: Size): PhotoCrop {
  const c = Math.max(frame.w / img.w, frame.h / img.h);
  const overX = img.w * c * start.zoom - frame.w;
  const overY = img.h * c * start.zoom - frame.h;
  const fx = overX > 0.5 ? start.fx - (dx / overX) * 100 : start.fx;
  const fy = overY > 0.5 ? start.fy - (dy / overY) * 100 : start.fy;
  return clampCrop({ ...start, fx, fy });
}

/**
 * Where the photo is drawn so the canvas matches the DOM (object-fit cover,
 * object-position fx% fy%, then scale(zoom) about that same point). Returns
 * the destination rect in frame px; draw it clipped to the frame.
 */
export function photoRect(img: Size, frame: Size, crop: PhotoCrop): { x: number; y: number; w: number; h: number } {
  const c = Math.max(frame.w / img.w, frame.h / img.h);
  const dw = img.w * c;
  const dh = img.h * c;
  const px = crop.fx / 100;
  const py = crop.fy / 100;
  const left = (frame.w - dw) * px;
  const top = (frame.h - dh) * py;
  const ox = frame.w * px;
  const oy = frame.h * py;
  return { x: ox + (left - ox) * crop.zoom, y: oy + (top - oy) * crop.zoom, w: dw * crop.zoom, h: dh * crop.zoom };
}

/** The transform at the export's size (1080 wide): every length times exportW / frame.w. */
export function toExport(t: OverlayTransform, frameW: number, exportW: number): OverlayTransform & { k: number } {
  const k = exportW / frameW;
  return { x: t.x * k, y: t.y * k, scale: t.scale * k, rotation: t.rotation, k };
}

/** The readout: "100%", "60%" (the layer) or the crop zoom on the Photo target ("160%"). */
export const readout = (v: number) => `${Math.round(v * 100)}%`;
