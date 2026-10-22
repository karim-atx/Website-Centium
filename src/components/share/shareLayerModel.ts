// Market + Share 3.0 · P-SH.3 ADDED "Your photo": the card's content as a
// transparent layer over the professional's own photo. Pure (no DOM, no
// canvas), so the DOM layer (ShareCard.tsx ShareLayer), the export
// (drawShareCard.ts drawShareLayerCard) and the tests read one layout.

import { PALETTE, cardFont, cardLink, fillClient, fitLinkSize, type CardPro, type CardSpec } from "./shareCardModel";
import type { OverlayTransform, PhotoCrop, Size } from "./overlayModel";

// ---------------------------------------------------------------------------
// The card layout types (drawShareCard lays out the card and paints both)
// ---------------------------------------------------------------------------

export interface CardMeasure {
  /** Advance width of `text` in `font` with `letterSpacing` px after every character (as CSS does). */
  width(text: string, font: string, letterSpacing: number): number;
  /** The font's ascent and descent in px: what a CSS line box centres. */
  extent(font: string): { ascent: number; descent: number };
}

export interface CardBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A drop shadow (CSS filter drop-shadow / box-shadow 0 y blur), in layout px. */
export interface Drop {
  color: string;
  y: number;
  blur: number;
}

// `alpha` (text) and `drop` (mark, QR tile) are only set by the Your photo
// layer (layoutShareLayer); the card's own layout never sets them.
export type CardOp =
  | { k: "text"; text: string; font: string; color: string; x: number; y: number; ls: number; shadow: boolean; alpha?: number }
  | { k: "mark"; box: CardBox; drop?: Drop }
  | { k: "leaf"; box: CardBox; color: string; alpha: number; rotate: number }
  | { k: "star"; box: CardBox; color: string }
  | { k: "rule"; box: CardBox; color: string }
  | { k: "chip"; box: CardBox; fill: string; border: string }
  | { k: "avatar"; box: CardBox; fill: string; border: string; borderWidth: number }
  | { k: "qr"; box: CardBox; pad: number; radius: number; ring: string; drop?: Drop };

export interface CardLayout {
  W: number;
  H: number;
  ops: CardOp[];
  /** Named boxes for checking against the DOM card: head, eyebrow, big (the hero number's span), stats, qr, foot. */
  boxes: Record<string, CardBox>;
  /** Every font and the text drawn in it, so the faces (and their unicode ranges) load before drawing. */
  fonts: Map<string, string>;
  /** The text shadow, when the card has one. */
  shadow: { color: string; offsetY: number; blur: number } | null;
}

/** The streak leaf's viewBox (StreakLeaf.tsx), as drawShareCard's LEAF_VIEW. */
const LEAF_VIEW = { w: 510, h: 915 };

/**
 * The layer's literal values (Professional Sharing Screens.dc.html, the yp*
 * frames' layer, lines 141 to 147): 100 wide, white, text-shadow 0 1px 8px
 * rgba(0,0,0,0.42) (the OverlayEditor's "client" chrome), line-height normal;
 * the mark 12.5 × 13.5 with drop-shadow(0 1px 3px rgba(0,0,0,0.35)) 4 from
 * the name (7.5 / 800 / 1.1) and "@handle on Centium" (6 / 600, 0.94); the
 * eyebrow 7 below (6 / 800, 0.14em, capitals); the number 2 below (25 / 800
 * / 0.95, -0.05em) with its unit (7.5 / 800) 2 apart on the baseline; the
 * subject 3 below (9 / 700); the line 2 below (6.5 / 600, 0.94); the QR row
 * 7 below: an 18 white tile (padding 1.5, r2.5, shadow 0 1px 4px
 * rgba(0,0,0,0.25)) so it scans, 4 from the link (5.4 / 800) and "Scan to
 * see my profile" (5 / 600, 0.94).
 * The board draws only the number hero. The stars and quote, the title, the
 * profile (avatar, name, headline, role), the leaves, the slot chips and the
 * stat row are not on the board: they take the same steps (flagged in W1).
 */
export const LAYER = {
  width: 100,
  shadow: { color: "rgba(0,0,0,0.42)", y: 1, blur: 8 },
  sub: 0.94,
  mark: { w: 12.5, h: 13.5, gap: 4, drop: { color: "rgba(0,0,0,0.35)", y: 1, blur: 3 } },
  name: { size: 7.5, weight: 800, lh: 1.1 },
  handle: { size: 6, weight: 600 },
  eyebrow: { mt: 7, size: 6, weight: 800, ls: 0.14 },
  big: { mt: 2, size: 25, weight: 800, lh: 0.95, ls: -0.05, gap: 2 },
  unit: { size: 7.5, weight: 800 },
  subject: { mt: 3, size: 9, weight: 700 },
  line: { mt: 2, size: 6.5, weight: 600 },
  stars: { mt: 2, size: 7, gap: 1, color: PALETTE.P.star },
  quote: { mt: 3, size: 9, weight: 700, lh: 1.24, ls: -0.02 },
  by: { mt: 3, size: 6.5, weight: 600 },
  title: { mt: 2, size: 12, weight: 800, lh: 1.06, ls: -0.03 },
  meta: { mt: 3, size: 6.5, weight: 600 },
  avatar: { mt: 3, size: 20, border: 1, text: 6.8, fill: "rgba(255,255,255,0.18)", ring: "rgba(255,255,255,0.35)" },
  pname: { mt: 3, size: 12, weight: 800, lh: 1.05, ls: -0.03 },
  head: { mt: 2, size: 7.5, weight: 700 },
  role: { mt: 1, size: 6.5, weight: 600 },
  leaves: { mt: 5, h: 5.4, gap: 2.2, color: "#A2C8C2" },
  slots: { mt: 5, size: 6, weight: 700, padY: 1.4, padX: 3, gap: 1.8, fill: PALETTE.P.chip, border: "rgba(255,255,255,0.4)" },
  stats: { mt: 7, padTop: 4, gap: 4, rule: "rgba(255,255,255,0.4)", star: 7, starGap: 1, val: { size: 9, weight: 800, lh: 1.1, ls: -0.03 }, lab: { mt: 1, size: 5, weight: 600, lh: 1.25 } },
  qr: { mt: 7, size: 15, pad: 1.5, radius: 2.5, gap: 4, drop: { color: "rgba(0,0,0,0.25)", y: 1, blur: 4 } },
  link: { size: 5.4, weight: 800 },
  scan: { size: 5, weight: 600 },
} as const;

/** The QR tile's outer size and the room left for the link beside it. */
export const LAYER_QR_TILE = LAYER.qr.size + 2 * LAYER.qr.pad;
export const LAYER_LINK_ROOM = LAYER.width - LAYER_QR_TILE - LAYER.qr.gap;

export interface LayerInput {
  spec: CardSpec;
  pro: CardPro;
  client?: string;
  qr?: boolean;
  hide?: number[];
}

interface LayerText {
  size: number;
  weight: number;
  /** A factor of the size; unset is line-height normal (the font's ascent + descent). */
  lh?: number;
  ls?: number;
  alpha?: number;
  upper?: boolean;
  shadow?: boolean;
}

/**
 * The layer laid out at its own size (100 wide, its natural height), in the
 * DOM layer's box model (ShareCard.tsx ShareLayer): every block left-aligned
 * at x 0, wrapped greedily at the layer width. The export paints it under the
 * overlay's transform (drawShareLayerCard).
 */
export function layoutShareLayer(o: LayerInput, m: CardMeasure): CardLayout {
  const L = LAYER;
  const W: number = L.width;
  const { spec: c, pro } = o;
  const client = o.client ?? "A client";
  const ops: CardOp[] = [];
  const boxes: Record<string, CardBox> = {};
  const fonts = new Map<string, string>();
  const fontOf = (s: LayerText) => cardFont(s.weight, s.size);
  const lsOf = (s: LayerText) => (s.ls ?? 0) * s.size;
  const widthOf = (text: string, s: LayerText) => {
    const f = fontOf(s);
    fonts.set(f, (fonts.get(f) ?? "") + text);
    return m.width(text, f, lsOf(s));
  };
  const lineH = (s: LayerText) => {
    if (s.lh != null) return s.lh * s.size;
    const e = m.extent(fontOf(s));
    return e.ascent + e.descent;
  };
  const baseIn = (top: number, lh: number, s: LayerText) => {
    const { ascent, descent } = m.extent(fontOf(s));
    return top + (lh - (ascent + descent)) / 2 + ascent;
  };
  const text = (t: string, s: LayerText, x: number, baseline: number) => {
    widthOf(t, s);
    ops.push({ k: "text", text: t, font: fontOf(s), color: "#FFFFFF", x, y: baseline, ls: lsOf(s), shadow: s.shadow !== false, ...(s.alpha != null ? { alpha: s.alpha } : null) });
  };
  const wrap = (t: string, s: LayerText, maxW: number): string[] => {
    const words = t.split(/ +/).filter((w) => w !== "");
    if (!words.length) return [];
    const lines: string[][] = [[words[0]]];
    for (const w of words.slice(1)) {
      const cur = lines[lines.length - 1];
      if (widthOf([...cur, w].join(" "), s) <= maxW + 0.01) cur.push(w);
      else lines.push([w]);
    }
    return lines.map((l) => l.join(" "));
  };

  let y = 0;
  /** A block of text at x across w, wrapped (or on one line), mt below the previous block. */
  const block = (raw: string, s: LayerText, mt: number, name?: string, x = 0, w = W) => {
    y += mt;
    const t = s.upper ? raw.toUpperCase() : raw;
    const lines = wrap(t, s, w);
    const lh = lineH(s);
    lines.forEach((ln, i) => text(ln, s, x, baseIn(y + i * lh, lh, s)));
    if (name) boxes[name] = { x, y, w, h: lines.length * lh };
    y += lines.length * lh;
  };
  const sub = (s: LayerText): LayerText => ({ ...s, alpha: L.sub });

  // --- Head: mark, name, "@handle on Centium" ---
  const nameS: LayerText = L.name;
  const handleS = sub(L.handle);
  const handleText = pro.handle ? `@${pro.handle} on Centium` : null;
  const nLH = lineH(nameS);
  const hLH = handleText ? lineH(handleS) : 0;
  const headH = Math.max(L.mark.h, nLH + hLH);
  ops.push({ k: "mark", box: { x: 0, y: (headH - L.mark.h) / 2, w: L.mark.w, h: L.mark.h }, drop: L.mark.drop });
  const tx = L.mark.w + L.mark.gap;
  const ty = (headH - (nLH + hLH)) / 2;
  text(pro.name, nameS, tx, baseIn(ty, nLH, nameS));
  if (handleText) text(handleText, handleS, tx, baseIn(ty + nLH, hLH, handleS));
  boxes.head = { x: 0, y: 0, w: W, h: headH };
  y = headH;

  block(c.eyebrow, { ...L.eyebrow, upper: true }, L.eyebrow.mt, "eyebrow");

  if (c.hero === "num") {
    y += L.big.mt;
    const parts: { t: string; s: LayerText }[] = [{ t: c.big ?? "", s: L.big }];
    if (c.unit) parts.push({ t: c.unit, s: L.unit });
    // align-items: baseline: each item's baseline sits at half-leading + ascent from its top.
    const metrics = parts.map(({ t, s }) => {
      const lh = lineH(s);
      const { ascent, descent } = m.extent(fontOf(s));
      return { t, s, lh, base: (lh - (ascent + descent)) / 2 + ascent, w: widthOf(t, s) };
    });
    const above = Math.max(...metrics.map((p) => p.base));
    const below = Math.max(...metrics.map((p) => p.lh - p.base));
    let x = 0;
    metrics.forEach((p, i) => {
      text(p.t, p.s, x, y + above);
      if (i === 0) boxes.big = { x, y: y + above - p.base, w: p.w, h: p.lh };
      x += p.w + L.big.gap;
    });
    y += above + below;
    block(c.subject ?? "", L.subject, L.subject.mt, "subject");
    if (c.line) block(fillClient(c.line, client) ?? "", sub(L.line), L.line.mt, "line");
  } else if (c.hero === "quote") {
    if (c.stars) {
      y += L.stars.mt;
      for (let i = 0; i < c.stars; i++) ops.push({ k: "star", box: { x: i * (L.stars.size + L.stars.gap), y, w: L.stars.size, h: L.stars.size }, color: L.stars.color });
      y += L.stars.size;
    }
    block(`"${c.quote ?? ""}"`, L.quote, c.stars ? L.quote.mt : L.stars.mt, "quote");
    if (c.by) block(c.by, sub(L.by), L.by.mt);
  } else if (c.hero === "title") {
    block(c.title ?? "", L.title, L.title.mt, "title");
    if (c.meta) block(fillClient(c.meta, client) ?? "", sub(L.meta), L.meta.mt);
  } else if (c.hero === "profile") {
    y += L.avatar.mt;
    const a = L.avatar;
    ops.push({ k: "avatar", box: { x: 0, y, w: a.size, h: a.size }, fill: a.fill, border: a.ring, borderWidth: a.border });
    const iniS: LayerText = { size: a.text, weight: 800, shadow: false };
    const ini = profileInitials(pro.name);
    const ilh = lineH(iniS);
    text(ini, iniS, (a.size - widthOf(ini, iniS)) / 2, baseIn(y + (a.size - ilh) / 2, ilh, iniS));
    y += a.size;
    block(pro.name, L.pname, L.pname.mt, "title");
    if (c.head) block(c.head, L.head, L.head.mt);
    if (c.role) block(c.role, sub(L.role), L.role.mt);
  }

  if (c.extra === "leaves") {
    y += L.leaves.mt;
    const lw = (L.leaves.h * LEAF_VIEW.w) / LEAF_VIEW.h;
    for (let i = 0; i < 7; i++) ops.push({ k: "leaf", box: { x: i * (lw + L.leaves.gap), y, w: lw, h: L.leaves.h }, color: L.leaves.color, alpha: 1, rotate: 0 });
    y += L.leaves.h;
  }
  if (c.extra === "slots" && c.slots?.length) {
    const s = L.slots;
    const chipS: LayerText = { size: s.size, weight: s.weight };
    const lh = lineH(chipS);
    const chipH = lh + 2 * s.padY + 2;
    const chips = c.slots.map((t) => ({ t, w: widthOf(t, chipS) + 2 * s.padX + 2 }));
    const rows: (typeof chips)[] = [[]];
    for (const ch of chips) {
      const row = rows[rows.length - 1];
      const used = row.reduce((acc, x) => acc + x.w, 0) + s.gap * row.length;
      if (row.length && used + ch.w > W + 0.01) rows.push([ch]);
      else row.push(ch);
    }
    y += s.mt;
    rows.forEach((row, ri) => {
      let x = 0;
      const top = y + ri * (chipH + s.gap);
      for (const ch of row) {
        ops.push({ k: "chip", box: { x, y: top, w: ch.w, h: chipH }, fill: s.fill, border: s.border });
        text(ch.t, chipS, x + 1 + s.padX, baseIn(top + 1 + s.padY, lh, chipS));
        x += ch.w + s.gap;
      }
    });
    y += rows.length * chipH + (rows.length - 1) * s.gap;
  }

  const stats = c.stats.filter((_, i) => !(o.hide && o.hide.includes(i))).slice(0, 3);
  if (stats.length) {
    const S = L.stats;
    y += S.mt;
    ops.push({ k: "rule", box: { x: 0, y, w: W, h: 1 }, color: S.rule });
    const top = y + 1 + S.padTop;
    const cellW = (W - S.gap * (stats.length - 1)) / stats.length;
    const valS: LayerText = S.val;
    const labS = sub(S.lab);
    const vLH = lineH(valS);
    const valH = Math.max(vLH, S.star);
    let rowH = 0;
    stats.forEach((st, i) => {
      const cx = i * (cellW + S.gap);
      let x = cx;
      if (st.key === "rating") {
        ops.push({ k: "star", box: { x, y: top + (valH - S.star) / 2, w: S.star, h: S.star }, color: L.stars.color });
        x += S.star + S.starGap;
      }
      text(st.value, valS, x, baseIn(top + (valH - vLH) / 2, vLH, valS));
      const save = y;
      y = top + valH;
      block(st.label, labS, S.lab.mt, undefined, cx, cellW);
      rowH = Math.max(rowH, y - top);
      y = save;
    });
    boxes.stats = { x: 0, y, w: W, h: 1 + S.padTop + rowH };
    y = top + rowH;
  }

  if (o.qr !== false && pro.handle) {
    const Q = L.qr;
    y += Q.mt;
    const linkS: LayerText = { ...L.link };
    const link = cardLink(pro.handle);
    linkS.size = fitLinkSize(L.link.size, widthOf(link, linkS), LAYER_LINK_ROOM);
    const scanS = sub(L.scan);
    const lLH = lineH(linkS);
    const sLH = lineH(scanS);
    const footH = Math.max(LAYER_QR_TILE, lLH + sLH);
    const box = { x: 0, y: y + (footH - LAYER_QR_TILE) / 2, w: LAYER_QR_TILE, h: LAYER_QR_TILE };
    ops.push({ k: "qr", box, pad: Q.pad, radius: Q.radius, ring: "", drop: Q.drop });
    boxes.qr = box;
    const fx = LAYER_QR_TILE + Q.gap;
    const fy = y + (footH - (lLH + sLH)) / 2;
    text(link, linkS, fx, baseIn(fy, lLH, linkS));
    text("Scan to see my profile", scanS, fx, baseIn(fy + lLH, sLH, scanS));
    boxes.foot = { x: 0, y, w: W, h: footH };
    y += footH;
  }

  return { W, H: y, ops, boxes, fonts, shadow: { color: L.shadow.color, offsetY: L.shadow.y, blur: L.shadow.blur } };
}

/** The profile avatar's initials, as ShareCard draws them. */
export const profileInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

/** The overlay editor's state as the export needs it (OverlayEditor's onChange). */
export interface LayerPlacement {
  transform: OverlayTransform;
  crop: PhotoCrop;
  /** The layer's measured size in the editor, frame px. */
  layer: Size;
  /** The editor's frame (220 wide). */
  frame: Size;
}
