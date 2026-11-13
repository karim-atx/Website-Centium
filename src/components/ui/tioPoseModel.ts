import type { TioState } from "./tioRotation";

// Handover "Tio + Centium Fixes", B §0–§1: where each Tio pose sits on a popup.
// Every value is computed from the pose PNG's own anchor (its natural size,
// the head's height in it, and its rest / grip line), so the table in the
// spec falls out of one formula: s = headHeight / headH, w = nW·s, h = nH·s.

export type PoseAsset = "tio-lie" | "tio-wave" | "tio-peek" | "tio-lean";

interface PoseSource {
  asset: PoseAsset;
  nW: number;
  nH: number;
  /** The head's height in the PNG (px). */
  headH: number;
  /** The anchor's x in the PNG: the rest / grip line's centre. */
  cx: number;
  /** The rest / grip line's y in the PNG. */
  rest: number;
}

const LIE: PoseSource = { asset: "tio-lie", nW: 1536, nH: 1024, headH: 810, cx: 784.5, rest: 1011 };
const WAVE: PoseSource = { asset: "tio-wave", nW: 1235, nH: 1274, headH: 743, cx: 624.5, rest: 1262 };
const PEEK: PoseSource = { asset: "tio-peek", nW: 1312, nH: 1199, headH: 1010, cx: 677, rest: 1116 };

/** Head height: 64 on the mobile sheet, 104 beside the web side sheet. */
export const TIO_HEAD_MOBILE = 64;
export const TIO_HEAD_WEB = 104;

/**
 * Mobile: Tio's anchor is 107 px from the sheet's right edge (430 − 323, the
 * Add Food spot), the rest / grip line on the sheet's top edge, whatever the
 * header (README ANSWERS 7). In Arabic the sheet's header mirrors (X on the
 * left), so the anchor is 107 px from the left edge.
 */
export const TIO_ANCHOR_FROM_END = 107;
/** RULE B3: the mobile Add Food sheet's height at 430 wide. */
export const TIO_MAX_SHEET_H = 668;

/** RULE B3: Tio only on a popup whose mobile sheet renders at 668 or less (a fill-height sheet takes its full max, 820 on a 932 phone). */
export const tioEligible = (height: number, fillHeight?: boolean): boolean => !fillHeight && height <= TIO_MAX_SHEET_H;

const round = (n: number) => Math.round(n * 100) / 100;

/** The delivered 1x / 2x / 3x PNGs (public/tio), the right one per screen density. */
export const tioSrc = (name: string): { src: string; srcSet: string } => ({
  src: `/tio/${name}.png`,
  srcSet: `/tio/${name}.png 1x, /tio/${name}@2x.png 2x, /tio/${name}@3x.png 3x`,
});

/**
 * Part A: the TioStateIcon glyph composition's boxes for a tile width W (A spec
 * §2): the head 0.8144 W at (−0.0258 W, 0.0916 W), the glyph box 0.42 W at
 * (0.582 W, 0.372 W). The spec's worked values for 44 / 56 / 72 fall out.
 */
export function tioGlyphLayout(w: number) {
  return {
    head: { left: round(-0.0258 * w), top: round(0.0916 * w), size: round(0.8144 * w) },
    glyph: { left: round(0.582 * w), top: round(0.372 * w), size: round(0.42 * w) },
  };
}

export interface MobilePose {
  asset: PoseAsset;
  width: number;
  height: number;
  /** From the sheet's top edge (negative: above it). */
  top: number;
  /** From the sheet's right edge to the image's right edge (LTR). */
  right: number;
  /** From the sheet's left edge to the image's left edge (RTL, the anchor mirrored). */
  left: number;
  /** The image's left on a 430 sheet (LTR), as the spec's table gives it. */
  left430: number;
}

export function mobilePose(state: TioState): MobilePose | null {
  const src = state === "lie" ? LIE : state === "wave" ? WAVE : state === "peek" ? PEEK : null;
  if (!src) return null;
  const s = TIO_HEAD_MOBILE / src.headH;
  const w = src.nW * s;
  const h = src.nH * s;
  const ax = src.cx * s;
  return {
    asset: src.asset,
    width: round(w),
    height: round(h),
    top: round(-src.rest * s),
    right: round(TIO_ANCHOR_FROM_END - (w - ax)),
    left: round(TIO_ANCHOR_FROM_END - ax),
    left430: round(430 - TIO_ANCHOR_FROM_END - ax),
  };
}

export interface WebPose {
  asset: PoseAsset;
  width: number;
  height: number;
  /** The image's left from the sheet's facing edge E (LTR: E + offset). */
  fromEdge: number;
  /** From the viewport bottom to the image's bottom. */
  bottom: number;
  /** H − top, as the spec writes the top (top = H − this). */
  topFromBottom: number;
  /** SIDEPEEK: rotate(−90deg) about the grip point. */
  rotate?: { deg: number; originX: number; originY: number };
  /** Under the sheet (LEAN) or over it (SIDEPEEK). */
  under: boolean;
}

/** LEAN's fixed web size (B spec §0: h 202.94 on web; w = 666 / 1277 of it). */
const LEAN_H = 202.94;
const LEAN_NW = 666;
const LEAN_NH = 1277;

/**
 * Web (≥ 1024): coordinates against the viewport W × H, sheet edge E = W − 440
 * (README ANSWERS 6). LEAN: back flush with the sheet edge, feet on the
 * viewport bottom, under the sheet and over the scrim. SIDEPEEK: TIO-PEEK
 * rotated −90° about its grip point, which sits on the sheet edge 93.65 above
 * the bottom; hands round the edge, over the sheet. SIDEPEEK has no asset of
 * its own: the spec draws it as TIO-PEEK rotated (frame B2 "TIO-PEEK-rot90").
 */
export function webPose(state: TioState): WebPose | null {
  if (state === "lean") {
    const h = LEAN_H;
    const w = (LEAN_NW / LEAN_NH) * h;
    return { asset: "tio-lean", width: round(w), height: round(h), fromEdge: round(-w), bottom: 0, topFromBottom: round(h), under: true };
  }
  if (state === "sidepeek") {
    const s = TIO_HEAD_WEB / PEEK.headH;
    const w = PEEK.nW * s;
    const h = PEEK.nH * s;
    const ox = PEEK.cx * s;
    const oy = PEEK.rest * s;
    // The grip point sits 40 + 53.65 = 93.65 above the viewport bottom.
    const gripFromBottom = 93.65;
    const top = gripFromBottom + oy; // H − top
    return {
      asset: "tio-peek",
      width: round(w),
      height: round(h),
      fromEdge: round(-ox),
      bottom: round(top - h),
      topFromBottom: round(top),
      rotate: { deg: -90, originX: round(ox), originY: round(oy) },
      under: false,
    };
  }
  return null;
}
