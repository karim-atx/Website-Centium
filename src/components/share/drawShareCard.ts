import { MARK_C_PATH, MARK_LEAF_PATH } from "../icons/CentiumMark";
import { STREAK_LEAF_PATH } from "../icons/StreakLeaf";
import { qrRows } from "./ShareQr";
import { hasArabic, loadArabicForCanvas } from "../../i18n/fonts";
import { isRtl, t } from "../../i18n/core";
import { EXPORT_WIDTH, PALETTE, textDirection, cardFont, cardHeight, cardLink, cardQrValue, fillClient, fitLinkSize, type CardPro, type CardSpec, type ShareFormat, type ShareStyle } from "./shareCardModel";
import { photoRect, toExport } from "./overlayModel";
import { LAYER, layoutShareLayer, type CardBox, type CardLayout, type CardMeasure, type CardOp, type Drop, type LayerInput, type LayerPlacement } from "./shareLayerModel";

// The layout types live with the pure layer layout (shareLayerModel) so the tests can read them; re-exported here.
export type { CardBox, CardLayout, CardMeasure, CardOp, Drop };

// Release 3 · W8 SH1 / SH7: the share card as a PNG. A canvas port of
// ShareCard.tsx (itself a literal port of source/gen/r31.js card31) at the
// export width: Story 1080 × 1920, Post 1080 × 1350, Square 1080 × 1080,
// Sticker a transparent 1080 × 1920 (SH1 "Type and numbers").
//
// layoutShareCard() is the DOM card's box model done by hand: every size is
// the same share of u = W / 100, rounded to 0.1 px as ShareCard's px() does;
// text sits in CSS line boxes (half-leading over the font's ascent and
// descent); unset line heights are the app's inherited 1.5; the head is at
// the top and [eyebrow, hero, extra], the stat row and the foot are pushed to
// the bottom by the flex spacer (the Sticker centres everything instead).
// drawShareCard() paints those boxes.
//
// Export-only choices: square corners and no card shadow (the PNG is the
// card); the Sticker has no background at all (no checker, no photo); the
// "your photo" placeholder tag is never exported; the text shadow
// (0 1px 10px rgba(0,0,0,0.38), Sticker and Photo) is scaled from the
// close-up board's 241 px card, so the PNG looks as the frames do.

/** The card width the 0 1px 10px text shadow is drawn at in the frames (SH1 close-ups). */
export const SHADOW_REF_WIDTH = 241;

const MARK_C = "#8F68F6";
const MARK_LEAF = "#8AC4BA";
const MARK_VIEW = { x: 279.1, y: 180.1, w: 687, h: 713 };
const LEAF_VIEW = { w: 510, h: 915 };
const STAR_POINTS = [12, 2, 15.1, 8.6, 22, 9.3, 16.8, 14, 18.2, 21, 12, 17.3, 5.8, 21, 7.2, 14, 2, 9.3, 8.9, 8.6];
const QR_INK = "#241F1B";
/** ShareCard inherits the app's line-height (Tailwind preflight, 1.5) wherever it sets none. */
const INHERITED_LH = 1.5;

export interface CardLayoutInput {
  spec: CardSpec;
  pro: CardPro;
  format: ShareFormat;
  style: ShareStyle;
  width: number;
  client?: string;
  qr?: boolean;
  hide?: number[];
}


const r1 = (v: number) => Math.round(v * 10) / 10;

interface TextStyle {
  weight: number;
  size: number;
  /** Line height as a factor of the size. */
  lh: number;
  /** Letter spacing in em. */
  ls?: number;
  color: string;
  shadow: boolean;
  upper?: boolean;
}

/** A block in the vertical stack: its margin above, its height, and how it draws once placed. */
interface Item {
  mt: number;
  h: number;
  place(top: number, ops: CardOp[], boxes: Record<string, CardBox>): void;
}

export function layoutShareCard(o: CardLayoutInput, m: CardMeasure): CardLayout {
  const { spec: c, pro, format, style } = o;
  const W = o.width;
  const client = o.client ?? t("A client");
  const P = PALETTE[style];
  const u = W / 100;
  const stk = format === "sticker";
  const sq = format === "square";
  const story = format === "story" || stk;
  const H = cardHeight(format, W);
  const hasShadow = stk || style === "P";
  const ink = stk ? "#FFFFFF" : P.ink;
  const sub = stk ? "rgba(255,255,255,0.94)" : P.sub;
  const acc = stk ? "#FFFFFF" : P.acc;
  const numCol = stk ? "#FFFFFF" : P.num;
  const line = stk ? "rgba(255,255,255,0.4)" : P.line;
  const stats = c.stats.filter((_, i) => !(o.hide && o.hide.includes(i))).slice(0, 3);
  const pad = r1((sq ? 6.5 : 7) * u);
  const showLink = o.qr !== false && !!pro.handle;
  const ops: CardOp[] = [];
  const boxes: Record<string, CardBox> = {};
  const fonts = new Map<string, string>();

  const colX = pad;
  const colW = W - 2 * pad;
  const centre = stk;

  const fontOf = (s: TextStyle) => cardFont(s.weight, s.size);
  const lsOf = (s: TextStyle) => (s.ls ?? 0) * s.size;
  const widthOf = (text: string, s: TextStyle) => {
    const f = fontOf(s);
    fonts.set(f, (fonts.get(f) ?? "") + text);
    return m.width(text, f, lsOf(s));
  };
  /** Baseline of a line box of height lineH starting at top, for style s. */
  const baselineIn = (top: number, lineH: number, s: TextStyle) => {
    const { ascent, descent } = m.extent(fontOf(s));
    return top + (lineH - (ascent + descent)) / 2 + ascent;
  };
  const textOp = (text: string, s: TextStyle, x: number, y: number) => {
    ops.push({ k: "text", text, font: fontOf(s), color: s.color, x, y, ls: lsOf(s), shadow: s.shadow });
  };

  /** Greedy wrapping at spaces, as CSS white-space: normal; `pretty` keeps a lone last word off its own line when it can. */
  const wrap = (text: string, s: TextStyle, maxW: number, pretty = false): string[] => {
    const words = text.split(/ +/).filter((w) => w !== "");
    if (!words.length) return [];
    const lines: string[][] = [[words[0]]];
    for (const w of words.slice(1)) {
      const cur = lines[lines.length - 1];
      if (widthOf([...cur, w].join(" "), s) <= maxW + 0.01) cur.push(w);
      else lines.push([w]);
    }
    if (pretty && lines.length >= 2) {
      const last = lines[lines.length - 1];
      // text-wrap: pretty as Blink's ScoreLineBreaker does it: only when the
      // greedy last line is a single word under a third of the width, the last
      // (up to) 4 lines are re-broken by least squared slack (the last line's
      // slack is free), with a line penalty of 4 × width × font size, a 10000
      // penalty on breaking before the last word (× 5 when it starts the last line), at least 3 break chances,
      // and the greedy result kept if the line count would change.
      if (last.length === 1 && widthOf(last[0], s) < maxW / 3) {
        const k = Math.min(4, lines.length);
        const tail = lines.slice(lines.length - k).flat();
        const n = tail.length;
        if (n - 1 >= 3) {
          const linePenalty = 4 * maxW * s.size;
          // best[j]: cheapest way to set words [0, j) ending in a break before word j.
          const best: { score: number; prev: number; lines: number }[] = [{ score: 0, prev: 0, lines: 0 }];
          for (let j = 1; j <= n; j++) {
            const isEnd = j === n;
            let b = { score: Infinity, prev: 0, lines: 0 };
            for (let i = 0; i < j; i++) {
              const slack = maxW - widthOf(tail.slice(i, j).join(" "), s);
              const width = slack < 0 ? 1e12 : isEnd ? 0 : slack * slack;
              // A last line that starts at a penalised break pays 4 × that penalty.
              const score = best[i].score + width + (isEnd && slack >= 0 && i === n - 1 ? 4 * 10000 : 0);
              if (score <= b.score) b = { score, prev: i, lines: best[i].lines + 1 };
            }
            const penalty = j === n - 1 ? 10000 : 0;
            best.push({ score: b.score + penalty + linePenalty, prev: b.prev, lines: b.lines });
          }
          if (best[n].lines === k) {
            const out: string[][] = [];
            for (let j = n; j > 0; j = best[j].prev) out.unshift(tail.slice(best[j].prev, j));
            lines.splice(lines.length - k, k, ...out);
          }
        }
      }
    }
    return lines.map((l) => l.join(" "));
  };

  /** A block of text across [x, x + w], wrapped (or one line), left or centred. */
  const textBlock = (raw: string, s: TextStyle, x: number, w: number, mt: number, opts: { nowrap?: boolean; pretty?: boolean; name?: string } = {}): Item => {
    const text = s.upper ? raw.toUpperCase() : raw;
    const lines = opts.nowrap ? (text ? [text] : []) : wrap(text, s, w, opts.pretty);
    const lineH = s.lh * s.size;
    return {
      mt,
      h: lines.length * lineH,
      place(top) {
        lines.forEach((t, i) => {
          const tw = widthOf(t, s);
          const lx = centre ? x + Math.max(0, (w - tw) / 2) : x;
          textOp(t, s, lx, baselineIn(top + i * lineH, lineH, s));
        });
        if (opts.name) boxes[opts.name] = { x, y: top, w, h: lines.length * lineH };
      },
    };
  };

  /** A row of fixed-size pieces (stars, leaves), left or centred. */
  const pieceRow = (n: number, pw: number, ph: number, gap: number, mt: number, draw: (box: CardBox) => CardOp): Item => ({
    mt,
    h: ph,
    place(top) {
      const total = n * pw + (n - 1) * gap;
      const x0 = centre ? colX + (colW - total) / 2 : colX;
      for (let i = 0; i < n; i++) ops.push(draw({ x: x0 + i * (pw + gap), y: top, w: pw, h: ph }));
    },
  });

  // --- Head: mark, name, "@handle on Centium" -----------------------------
  const markW = r1((sq ? 7 : 8) * u);
  const markH = (sq ? 7.3 : 8.3) * u; // CentiumMark's height attribute is not rounded
  const nameS: TextStyle = { weight: 800, size: r1((sq ? 3.5 : 3.8) * u), lh: 1.15, color: ink, shadow: hasShadow };
  const handleS: TextStyle = { weight: 600, size: r1((sq ? 2.8 : 3) * u), lh: 1.25, color: sub, shadow: hasShadow };
  const handleText = pro.handle ? t("@{handle} on Centium", { handle: pro.handle }) : null;
  const headGap = r1(2.4 * u);
  const nameW = widthOf(pro.name, nameS);
  const handleW = handleText ? widthOf(handleText, handleS) : 0;
  const headTextH = nameS.lh * nameS.size + (handleText ? handleS.lh * handleS.size : 0);
  const headH = Math.max(markH, headTextH);
  const placeHead = (top: number) => {
    // The text div shrinks (min-width 0) when the row is wider than the column.
    const textW = Math.min(Math.max(nameW, handleW), Math.max(0, colW - markW - headGap));
    const rowW = markW + headGap + textW;
    const x0 = centre ? colX + (colW - rowW) / 2 : colX;
    ops.push({ k: "mark", box: { x: x0, y: top + (headH - markH) / 2, w: markW, h: markH } });
    const tx = x0 + markW + headGap;
    const ty = top + (headH - headTextH) / 2;
    const nameLH = nameS.lh * nameS.size;
    const lineX = (lw: number) => (centre ? tx + Math.max(0, (textW - lw) / 2) : tx);
    textOp(pro.name, nameS, lineX(nameW), baselineIn(ty, nameLH, nameS));
    if (handleText) textOp(handleText, handleS, lineX(handleW), baselineIn(ty + nameLH, handleS.lh * handleS.size, handleS));
    boxes.head = { x: x0, y: top, w: rowW, h: headH };
  };

  // --- The stack under the head -------------------------------------------
  const items: Item[] = [];
  const eyebrowS: TextStyle = { weight: 800, size: r1((sq ? 2.9 : 3.2) * u), lh: INHERITED_LH, ls: 0.14, color: acc, shadow: hasShadow, upper: true };
  items.push(textBlock(c.eyebrow, eyebrowS, colX, colW, 0, { name: "eyebrow" }));
  let after = r1(2 * u); // the eyebrow's margin-bottom

  if (c.hero === "num") {
    const bs = stk ? 30 : story ? 30 : sq ? 19 : 24;
    const bigS: TextStyle = { weight: 800, size: r1(bs * u), lh: 0.9, ls: -0.05, color: numCol, shadow: hasShadow };
    const unitS: TextStyle = { weight: 800, size: r1(bs * 0.3 * u), lh: INHERITED_LH, ls: -0.02, color: numCol, shadow: hasShadow };
    const big = c.big ?? "";
    const parts: { t: string; s: TextStyle }[] = [{ t: big, s: bigS }];
    if (c.unit) parts.push({ t: c.unit, s: unitS });
    const gap = r1(1.6 * u);
    // align-items: baseline: each item's baseline sits at half-leading + ascent from its top.
    const metrics = parts.map(({ t, s }) => {
      const lh = s.lh * s.size;
      const { ascent, descent } = m.extent(fontOf(s));
      return { t, s, lh, base: (lh - (ascent + descent)) / 2 + ascent, w: widthOf(t, s) };
    });
    const above = Math.max(...metrics.map((p) => p.base));
    const below = Math.max(...metrics.map((p) => p.lh - p.base));
    items.push({
      mt: after,
      h: above + below,
      place(top) {
        const total = metrics.reduce((a, p) => a + p.w, 0) + gap * (metrics.length - 1);
        let x = centre ? colX + (colW - total) / 2 : colX;
        const baseline = top + above;
        metrics.forEach((p, i) => {
          textOp(p.t, p.s, x, baseline);
          if (i === 0) boxes.big = { x, y: baseline - p.base, w: p.w, h: p.lh };
          x += p.w + gap;
        });
        boxes.heroBaseline = { x: colX, y: baseline, w: 0, h: 0 };
      },
    });
    after = 0;
    items.push(textBlock(c.subject ?? "", { weight: 700, size: r1((sq ? 5 : 6.2) * u), lh: 1.15, ls: -0.02, color: ink, shadow: hasShadow }, colX, colW, r1(2.4 * u)));
    if (c.line) items.push(textBlock(fillClient(c.line, client) ?? "", { weight: 600, size: r1((sq ? 3 : 3.5) * u), lh: 1.35, color: sub, shadow: hasShadow }, colX, colW, r1(1.2 * u)));
  } else if (c.hero === "quote") {
    if (c.stars) {
      const s = r1((sq ? 5 : 6.4) * u);
      items.push(pieceRow(c.stars, s, s, r1(1 * u), after, (box) => ({ k: "star", box, color: P.star })));
      after = r1(3 * u);
    }
    items.push(textBlock(`"${c.quote ?? ""}"`, { weight: 700, size: r1((sq ? 5.4 : story ? 7 : 6.4) * u), lh: 1.24, ls: -0.02, color: ink, shadow: hasShadow }, colX, colW, after, { pretty: true }));
    after = 0;
    items.push(textBlock(c.by ?? "", { weight: 600, size: r1((sq ? 3 : 3.4) * u), lh: INHERITED_LH, color: sub, shadow: hasShadow }, colX, colW, r1(2.6 * u)));
  } else if (c.hero === "title") {
    items.push(textBlock(c.title ?? "", { weight: 800, size: r1((sq ? 7.4 : story ? 9.4 : 8.4) * u), lh: 1.06, ls: -0.03, color: numCol, shadow: hasShadow }, colX, colW, after, { pretty: true }));
    after = 0;
    if (c.meta) items.push(textBlock(fillClient(c.meta, client) ?? "", { weight: 600, size: r1((sq ? 3 : 3.5) * u), lh: INHERITED_LH, color: sub, shadow: hasShadow }, colX, colW, r1(2.2 * u)));
  } else if (c.hero === "profile") {
    const av = r1((sq ? 13 : story ? 22 : 17) * u);
    const bw = r1(0.8 * u);
    const initials = pro.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
    const iniS: TextStyle = { weight: 800, size: r1(av * 0.34), lh: INHERITED_LH, color: style === "L" ? "#2F5F58" : "#FFFFFF", shadow: false };
    items.push({
      mt: after,
      h: av,
      place(top) {
        const x = centre ? colX + (colW - av) / 2 : colX;
        ops.push({ k: "avatar", box: { x, y: top, w: av, h: av }, fill: style === "L" ? "#E4F0EE" : "rgba(255,255,255,0.18)", border: style === "L" ? "#FFFFFF" : "rgba(255,255,255,0.35)", borderWidth: bw });
        const lh = iniS.lh * iniS.size;
        const tw = widthOf(initials, iniS);
        textOp(initials, iniS, x + (av - tw) / 2, baselineIn(top + (av - lh) / 2, lh, iniS));
      },
    });
    after = r1(3.4 * u);
    items.push(textBlock(pro.name, { weight: 800, size: r1((sq ? 7 : story ? 9 : 8) * u), lh: 1.05, ls: -0.03, color: numCol, shadow: hasShadow }, colX, colW, after));
    after = 0;
    if (c.head) items.push(textBlock(c.head, { weight: 700, size: r1((sq ? 4.2 : 5) * u), lh: INHERITED_LH, color: acc, shadow: hasShadow }, colX, colW, r1(1.4 * u)));
    if (c.role) items.push(textBlock(c.role, { weight: 600, size: r1((sq ? 3 : 3.5) * u), lh: INHERITED_LH, color: sub, shadow: hasShadow }, colX, colW, r1(1 * u)));
  }

  // --- Extra: seven leaves, or the slot chips -----------------------------
  if (c.extra === "leaves" && !sq) {
    const lh = r1(5.4 * u);
    const lw = r1((5.4 * u * LEAF_VIEW.w) / LEAF_VIEW.h);
    const col = stk || style !== "L" ? "#A2C8C2" : "#6F9993";
    items.push(pieceRow(7, lw, lh, r1(2.2 * u), r1(4 * u) + after, (box) => ({ k: "leaf", box, color: col, alpha: 1, rotate: 0 })));
    after = 0;
  }
  if (c.extra === "slots" && c.slots?.length) {
    const chipS: TextStyle = { weight: 700, size: r1((sq ? 3.1 : 3.5) * u), lh: INHERITED_LH, color: ink, shadow: false };
    const padY = r1(1.4 * u);
    const padX = r1(3 * u);
    const gap = r1(1.8 * u);
    const chipH = chipS.lh * chipS.size + 2 * padY + 2;
    const chips = c.slots.map((t) => ({ t, w: widthOf(t, chipS) + 2 * padX + 2 }));
    const rows: (typeof chips)[] = [[]];
    for (const ch of chips) {
      const row = rows[rows.length - 1];
      const used = row.reduce((a, x) => a + x.w, 0) + gap * row.length;
      if (row.length && used + ch.w > colW + 0.01) rows.push([ch]);
      else row.push(ch);
    }
    items.push({
      mt: r1((sq ? 3 : 4) * u) + after,
      h: rows.length * chipH + (rows.length - 1) * gap,
      place(top) {
        rows.forEach((row, ri) => {
          const total = row.reduce((a, x) => a + x.w, 0) + gap * (row.length - 1);
          let x = centre ? colX + (colW - total) / 2 : colX;
          const y = top + ri * (chipH + gap);
          for (const ch of row) {
            ops.push({ k: "chip", box: { x, y, w: ch.w, h: chipH }, fill: P.chip, border: line });
            const lh = chipS.lh * chipS.size;
            textOp(ch.t, chipS, x + 1 + padX, baselineIn(y + 1 + padY, lh, chipS));
            x += ch.w + gap;
          }
        });
      },
    });
    after = 0;
  }

  // --- The stat row --------------------------------------------------------
  if (stats.length) {
    const sv = stk ? 6.6 : sq ? 5.2 : 6;
    const sl = sq ? 2.6 : 2.9;
    const gap = r1(3 * u);
    const padTop = r1((sq ? 3 : 4) * u);
    const valS: TextStyle = { weight: 800, size: r1(sv * u), lh: 1.1, ls: -0.03, color: numCol, shadow: hasShadow };
    const labS: TextStyle = { weight: 600, size: r1(sl * u), lh: 1.25, color: sub, shadow: hasShadow };
    const starS = r1(sv * 0.78 * u);
    const starGap = r1(0.8 * u);
    const labMt = r1(0.8 * u);
    const cellW = (colW - gap * (stats.length - 1)) / stats.length;
    const valH = Math.max(valS.lh * valS.size, starS);
    const cells = stats.map((s, i) => {
      const cx = colX + i * (cellW + gap);
      const label = textBlock(s.label, labS, cx, cellW, labMt);
      return { s, cx, label, h: valH + labMt + label.h };
    });
    const rowH = Math.max(...cells.map((x) => x.h));
    items.push({
      mt: r1((sq ? 4 : 6) * u) + after,
      h: 1 + padTop + rowH,
      place(top) {
        ops.push({ k: "rule", box: { x: colX, y: top, w: colW, h: 1 }, color: line });
        boxes.stats = { x: colX, y: top, w: colW, h: 1 + padTop + rowH };
        const vTop = top + 1 + padTop;
        for (const cell of cells) {
          const star = cell.s.key === "rating";
          const tw = widthOf(cell.s.value, valS);
          const total = tw + (star ? starS + starGap : 0);
          let x = centre ? cell.cx + (cellW - total) / 2 : cell.cx;
          if (star) {
            ops.push({ k: "star", box: { x, y: vTop + (valH - starS) / 2, w: starS, h: starS }, color: PALETTE[style].star });
            x += starS + starGap;
          }
          const lh = valS.lh * valS.size;
          textOp(cell.s.value, valS, x, baselineIn(vTop + (valH - lh) / 2, lh, valS));
          cell.label.place(vTop + valH + labMt, ops, boxes);
        }
      },
    });
    after = 0;
  }

  // --- The foot: QR tile, link and "Scan to see my profile" ---------------
  if (showLink) {
    const qs = r1((sq ? 11 : story ? 15 : 12.5) * u);
    const qpad = r1(1.1 * u);
    const tile = qs + 2 * qpad;
    const gap = r1(3 * u);
    const linkS: TextStyle = { weight: 800, size: r1((sq ? 3 : 3.3) * u), lh: INHERITED_LH, color: ink, shadow: hasShadow };
    const scanS: TextStyle = { weight: 600, size: r1((sq ? 2.6 : 2.9) * u), lh: INHERITED_LH, color: sub, shadow: hasShadow };
    const link = cardLink(pro.handle!);
    let linkW = widthOf(link, linkS);
    const fitted = fitLinkSize(linkS.size, linkW, Math.max(0, colW - (stk ? 0 : tile + gap)));
    if (fitted !== linkS.size) {
      linkS.size = fitted;
      linkW = widthOf(link, linkS);
    }
    const scan = t("Scan to see my profile");
    const scanW = stk ? 0 : widthOf(scan, scanS);
    const textH = linkS.lh * linkS.size + (stk ? 0 : scanS.lh * scanS.size);
    const footH = stk ? textH : Math.max(tile, textH);
    items.push({
      mt: r1((sq ? 4 : 6) * u) + after,
      h: footH,
      place(top) {
        const lead = stk ? 0 : tile + gap;
        const textW = Math.min(Math.max(linkW, scanW), Math.max(0, colW - lead));
        const total = lead + textW;
        const x0 = centre ? colX + (colW - total) / 2 : colX;
        if (!stk) {
          const box = { x: x0, y: top + (footH - tile) / 2, w: tile, h: tile };
          ops.push({ k: "qr", box, pad: qpad, radius: r1(1.8 * u), ring: line });
          boxes.qr = box;
        }
        const tx = x0 + lead;
        const ty = top + (footH - textH) / 2;
        const lineX = (lw: number) => (centre ? tx + Math.max(0, (textW - lw) / 2) : tx);
        const lLH = linkS.lh * linkS.size;
        textOp(link, linkS, lineX(linkW), baselineIn(ty, lLH, linkS));
        if (!stk) textOp(scan, scanS, lineX(scanW), baselineIn(ty + lLH, scanS.lh * scanS.size, scanS));
        boxes.foot = { x: x0, y: top, w: total, h: footH };
      },
    });
  }

  // --- Place the stack -----------------------------------------------------
  const stackH = items.reduce((a, it) => a + it.mt + it.h, 0);
  let top: number;
  if (stk) {
    const gapTop = r1(8 * u);
    const total = headH + gapTop + stackH;
    const headTop = pad + (H - 2 * pad - total) / 2;
    placeHead(headTop);
    top = headTop + headH + gapTop;
  } else {
    placeHead(pad);
    // The flex spacer pushes the rest to the bottom; it never goes below 0.
    top = Math.max(pad + headH, H - pad - stackH);
  }
  for (const it of items) {
    top += it.mt;
    it.place(top, ops, boxes);
    top += it.h;
  }

  // The streak leaf off the right edge sits under everything (drawn first).
  if (!stk && P.lop) {
    const raw = (story ? 118 : sq ? 92 : 100) * u;
    const lh = r1(raw);
    const lw = r1((raw * LEAF_VIEW.w) / LEAF_VIEW.h);
    const right = r1(-16 * u);
    const y = (story ? 0.26 : sq ? -0.18 : 0.04) * H;
    ops.unshift({ k: "leaf", box: { x: W - right - lw, y, w: lw, h: lh }, color: P.leaf, alpha: P.lop, rotate: 28 });
  }

  const s = W / SHADOW_REF_WIDTH;
  return { W, H, ops, boxes, fonts, shadow: hasShadow ? { color: "rgba(0,0,0,0.38)", offsetY: 1 * s, blur: 10 * s } : null };
}

// ---------------------------------------------------------------------------
// Painting
// ---------------------------------------------------------------------------

const hasLetterSpacing = (ctx: CanvasRenderingContext2D) => "letterSpacing" in ctx;

function canvasMeasure(ctx: CanvasRenderingContext2D): CardMeasure {
  const native = hasLetterSpacing(ctx);
  const extents = new Map<string, { ascent: number; descent: number }>();
  const rtl = isRtl();
  return {
    width(text, font, lsIn) {
      // Arabic: no tracking, as the DOM card (shareCardModel cardBidiClass).
      const ls = rtl ? 0 : lsIn;
      ctx.font = font;
      if (native) {
        ctx.letterSpacing = `${ls}px`;
        return ctx.measureText(text).width;
      }
      return ctx.measureText(text).width + ls * [...text].length;
    },
    extent(font) {
      const hit = extents.get(font);
      if (hit) return hit;
      ctx.font = font;
      if (native) ctx.letterSpacing = "0px";
      const mt = ctx.measureText("Hg");
      // Blink lays text out on whole-pixel ascent and descent.
      const e = { ascent: Math.round(mt.fontBoundingBoxAscent), descent: Math.round(mt.fontBoundingBoxDescent) };
      extents.set(font, e);
      return e;
    },
  };
}

function fillText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, lsIn: number) {
  // Arabic: each line in its own direction and untracked, as the DOM card;
  // textAlign stays "left", so the line still starts at x.
  const rtl = isRtl();
  const ls = rtl ? 0 : lsIn;
  if (rtl) ctx.direction = textDirection(text);
  if (hasLetterSpacing(ctx) || hasArabic(text)) {
    if (hasLetterSpacing(ctx)) ctx.letterSpacing = `${ls}px`;
    ctx.fillText(text, x, y);
    return;
  }
  // No canvas letter-spacing (older Safari): one character at a time.
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + ls;
  }
}

/** CSS gradient line for an angle (0deg = to top, clockwise) over a W × H box. */
function cssLinear(ctx: CanvasRenderingContext2D, deg: number, W: number, H: number) {
  const a = (deg * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const len = Math.abs(W * dx) + Math.abs(H * dy);
  const cx = W / 2;
  const cy = H / 2;
  return ctx.createLinearGradient(cx - (dx * len) / 2, cy - (dy * len) / 2, cx + (dx * len) / 2, cy + (dy * len) / 2);
}

function paintBackground(ctx: CanvasRenderingContext2D, style: ShareStyle, W: number, H: number, photo: HTMLImageElement | null | undefined) {
  if (style === "L") {
    ctx.fillStyle = "#FBFAFE";
    ctx.fillRect(0, 0, W, H);
  } else if (style === "D") {
    // radial-gradient(120% 70% at 90% 0%, #2B2645 0%, #16171D 62%)
    const rx = 1.2 * W;
    const ry = 0.7 * H;
    ctx.save();
    ctx.translate(0.9 * W, 0);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, "#2B2645");
    g.addColorStop(0.62, "#16171D");
    g.addColorStop(1, "#16171D");
    ctx.fillStyle = g;
    ctx.fillRect(-0.9 * W, 0, W, H / (ry / rx));
    ctx.restore();
  } else if (style === "B") {
    // linear-gradient(150deg, #7D6BB5 0%, #66709F 52%, #4F7F78 100%)
    const g = cssLinear(ctx, 150, W, H);
    g.addColorStop(0, "#7D6BB5");
    g.addColorStop(0.52, "#66709F");
    g.addColorStop(1, "#4F7F78");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else {
    if (photo && photo.naturalWidth && photo.naturalHeight) {
      // center / cover
      const sc = Math.max(W / photo.naturalWidth, H / photo.naturalHeight);
      const dw = photo.naturalWidth * sc;
      const dh = photo.naturalHeight * sc;
      ctx.drawImage(photo, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } else {
      // repeating-linear-gradient(135deg, #3E3A36 0 10px, #37332F 10px 20px)
      const a = (135 * Math.PI) / 180;
      const len = Math.abs(W * Math.sin(a)) + Math.abs(H * Math.cos(a));
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(a - Math.PI / 2);
      for (let t = 0, i = 0; t < len; t += 10, i++) {
        ctx.fillStyle = i % 2 ? "#37332F" : "#3E3A36";
        ctx.fillRect(-len / 2 + t, -len, 10.5, 2 * len);
      }
      ctx.restore();
    }
    // PHOTO_SCRIM: linear-gradient(to top, rgba(18,19,23,0.9) 0%, rgba(18,19,23,0.5) 46%, rgba(18,19,23,0.25) 100%)
    const g = ctx.createLinearGradient(0, H, 0, 0);
    g.addColorStop(0, "rgba(18,19,23,0.9)");
    g.addColorStop(0.46, "rgba(18,19,23,0.5)");
    g.addColorStop(1, "rgba(18,19,23,0.25)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

function roundRectPath(ctx: CanvasRenderingContext2D, b: CardBox, r: number) {
  const rr = Math.min(r, b.w / 2, b.h / 2);
  ctx.moveTo(b.x + rr, b.y);
  ctx.arcTo(b.x + b.w, b.y, b.x + b.w, b.y + b.h, rr);
  ctx.arcTo(b.x + b.w, b.y + b.h, b.x, b.y + b.h, rr);
  ctx.arcTo(b.x, b.y + b.h, b.x, b.y, rr);
  ctx.arcTo(b.x, b.y, b.x + b.w, b.y, rr);
  ctx.closePath();
}

function paintStar(ctx: CanvasRenderingContext2D, b: CardBox, color: string) {
  const s = b.w / 24;
  ctx.beginPath();
  for (let i = 0; i < STAR_POINTS.length; i += 2) {
    const x = b.x + STAR_POINTS[i] * s;
    const y = b.y + STAR_POINTS[i + 1] * s;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * `shadowScale`: canvas shadows ignore the transform, so a layout painted
 * under a scale (the Your photo layer) passes that scale for its drops.
 */
function paintOps(ctx: CanvasRenderingContext2D, L: CardLayout, qr: boolean[][] | null, shadowScale = 1) {
  const leaf = new Path2D(STREAK_LEAF_PATH);
  const markC = new Path2D(MARK_C_PATH);
  const markLeaf = new Path2D(MARK_LEAF_PATH);
  const drop = (d: Drop | undefined) => {
    if (!d) return;
    ctx.shadowColor = d.color;
    ctx.shadowOffsetY = d.y * shadowScale;
    ctx.shadowBlur = d.blur * shadowScale;
  };
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  for (const op of L.ops) {
    ctx.save();
    switch (op.k) {
      case "text":
        ctx.font = op.font;
        ctx.fillStyle = op.color;
        if (op.alpha != null) ctx.globalAlpha = op.alpha;
        if (op.shadow && L.shadow) {
          ctx.shadowColor = L.shadow.color;
          ctx.shadowOffsetY = L.shadow.offsetY;
          ctx.shadowBlur = L.shadow.blur;
        }
        fillText(ctx, op.text, op.x, op.y, op.ls);
        break;
      case "mark": {
        drop(op.drop);
        // viewBox 279.1 180.1 687 713, xMidYMid meet.
        const s = Math.min(op.box.w / MARK_VIEW.w, op.box.h / MARK_VIEW.h);
        ctx.translate(op.box.x + (op.box.w - MARK_VIEW.w * s) / 2, op.box.y + (op.box.h - MARK_VIEW.h * s) / 2);
        ctx.scale(s, s);
        ctx.translate(-MARK_VIEW.x, -MARK_VIEW.y);
        ctx.fillStyle = MARK_C;
        ctx.fill(markC);
        ctx.fillStyle = MARK_LEAF;
        ctx.fill(markLeaf);
        break;
      }
      case "leaf": {
        const { x, y, w, h } = op.box;
        ctx.translate(x + w / 2, y + h / 2);
        if (op.rotate) ctx.rotate((op.rotate * Math.PI) / 180);
        const s = Math.min(w / LEAF_VIEW.w, h / LEAF_VIEW.h);
        ctx.translate(-(LEAF_VIEW.w * s) / 2, -(LEAF_VIEW.h * s) / 2);
        ctx.scale(s, s);
        ctx.globalAlpha = op.alpha;
        ctx.fillStyle = op.color;
        ctx.fill(leaf);
        break;
      }
      case "star":
        paintStar(ctx, op.box, op.color);
        break;
      case "rule":
        ctx.fillStyle = op.color;
        ctx.fillRect(op.box.x, op.box.y, op.box.w, op.box.h);
        break;
      case "chip": {
        ctx.beginPath();
        roundRectPath(ctx, op.box, op.box.h / 2);
        ctx.fillStyle = op.fill;
        ctx.fill();
        ctx.beginPath();
        roundRectPath(ctx, { x: op.box.x + 0.5, y: op.box.y + 0.5, w: op.box.w - 1, h: op.box.h - 1 }, (op.box.h - 1) / 2);
        ctx.strokeStyle = op.border;
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      }
      case "avatar": {
        const r = op.box.w / 2;
        const cx = op.box.x + r;
        const cy = op.box.y + r;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = op.fill;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, r - op.borderWidth / 2, 0, Math.PI * 2);
        ctx.strokeStyle = op.border;
        ctx.lineWidth = op.borderWidth;
        ctx.stroke();
        break;
      }
      case "qr": {
        const b = op.box;
        if (op.ring) {
          // box-shadow: 0 0 0 1px {line}, outside the tile only.
          ctx.beginPath();
          roundRectPath(ctx, { x: b.x - 1, y: b.y - 1, w: b.w + 2, h: b.h + 2 }, op.radius + 1);
          roundRectPath(ctx, b, op.radius);
          ctx.fillStyle = op.ring;
          ctx.fill("evenodd");
        }
        ctx.save();
        drop(op.drop);
        ctx.beginPath();
        roundRectPath(ctx, b, op.radius);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
        ctx.restore();
        if (qr && qr.length) {
          const n = qr.length;
          const ox = b.x + op.pad;
          const oy = b.y + op.pad;
          const cell = (b.w - 2 * op.pad) / n;
          ctx.fillStyle = QR_INK;
          if (op.drop) {
            // Under the layer's transform whole-pixel rounding doesn't apply:
            // every module goes in one path, filled once, so neighbours meet
            // without anti-aliased seams and the code stays scannable.
            ctx.beginPath();
            for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr[y][x]) ctx.rect(ox + x * cell, oy + y * cell, cell, cell);
            ctx.fill("nonzero");
            break;
          }
          for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
              if (!qr[y][x]) continue;
              // Whole pixels, so neighbouring modules meet without seams.
              const x0 = Math.round(ox + x * cell);
              const y0 = Math.round(oy + y * cell);
              ctx.fillRect(x0, y0, Math.round(ox + (x + 1) * cell) - x0, Math.round(oy + (y + 1) * cell) - y0);
            }
          }
        }
        break;
      }
    }
    ctx.restore();
  }
}

export interface DrawShareCardOptions {
  spec: CardSpec;
  pro: CardPro;
  format: ShareFormat;
  style: ShareStyle;
  client?: string;
  qr?: boolean;
  hide?: number[];
  photo?: HTMLImageElement | null;
}

/**
 * Draws the card at EXPORT_WIDTH × cardHeight(format) into `canvas`. Waits for
 * Manrope (every weight and size used, with the text drawn in it) and for the
 * QR's modules first. Throws when it can't draw (no 2D context, no QR).
 */
export async function drawShareCard(canvas: HTMLCanvasElement, o: DrawShareCardOptions): Promise<void> {
  const W = EXPORT_WIDTH;
  const H = cardHeight(o.format, W);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D canvas context");
  const input: CardLayoutInput = { spec: o.spec, pro: o.pro, format: o.format, style: o.style, width: W, client: o.client, qr: o.qr, hide: o.hide };

  const needsQr = o.qr !== false && !!o.pro.handle && o.format !== "sticker";
  const qrPromise = needsQr ? qrRows(cardQrValue(o.pro.handle!)) : Promise.resolve(null);

  // Fonts: lay out once to learn every font and its text, load those faces, then lay out for real.
  await document.fonts.ready;
  const first = layoutShareCard(input, canvasMeasure(ctx));
  await loadArabicForCanvas(first.fonts.keys(), [...first.fonts.values()].join(""));
  await Promise.all([...first.fonts].map(([font, text]) => document.fonts.load(font, text).catch(() => [])));
  const layout = layoutShareCard(input, canvasMeasure(ctx));

  const qr = await qrPromise;
  if (needsQr && !qr) throw new Error("QR code unavailable");

  ctx.clearRect(0, 0, W, H);
  if (o.format !== "sticker") paintBackground(ctx, o.style, W, H, o.photo);
  paintOps(ctx, layout, qr);
}

export interface DrawShareLayerOptions extends LayerInput {
  format: "story" | "post" | "square";
  photo: HTMLImageElement;
  placement: LayerPlacement;
}

/**
 * Your photo at the export size (1080 wide; Story 1920, Post 1350, Square
 * 1080): the photo cover-fit with the editor's crop (photoRect, so the PNG
 * matches the DOM), then the layer at toExport(): translated to its centre,
 * scaled, rotated, drawn at its own 100-wide layout. No scrim, no card
 * background: only the photo and the layer. The QR keeps its white tile.
 */
export async function drawShareLayerCard(canvas: HTMLCanvasElement, o: DrawShareLayerOptions): Promise<void> {
  const W = EXPORT_WIDTH;
  const H = cardHeight(o.format, W);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D canvas context");
  const input: LayerInput = { spec: o.spec, pro: o.pro, client: o.client, qr: o.qr, hide: o.hide };
  const needsQr = o.qr !== false && !!o.pro.handle;
  const qrPromise = needsQr ? qrRows(cardQrValue(o.pro.handle!)) : Promise.resolve(null);

  await document.fonts.ready;
  const first = layoutShareLayer(input, canvasMeasure(ctx));
  await loadArabicForCanvas(first.fonts.keys(), [...first.fonts.values()].join(""));
  await Promise.all([...first.fonts].map(([font, text]) => document.fonts.load(font, text).catch(() => [])));
  const layout = layoutShareLayer(input, canvasMeasure(ctx));
  const qr = await qrPromise;
  if (needsQr && !qr) throw new Error("QR code unavailable");

  const { frame, crop, transform } = o.placement;
  const k = W / frame.w;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#2A2B31";
  ctx.fillRect(0, 0, W, H);
  // The export's frame in editor px (Story 1920 / k is 391.1, not 391), so the cover reaches the last row.
  const r = photoRect({ w: o.photo.naturalWidth || 1, h: o.photo.naturalHeight || 1 }, { w: frame.w, h: H / k }, crop);
  ctx.drawImage(o.photo, r.x * k, r.y * k, r.w * k, r.h * k);

  const t = toExport(transform, frame.w, W);
  const layerH = o.placement.layer.h || layout.H;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.scale(t.scale, t.scale);
  ctx.rotate((t.rotation * Math.PI) / 180);
  ctx.translate(-layout.W / 2, -layerH / 2);
  paintOps(ctx, { ...layout, shadow: { color: LAYER.shadow.color, offsetY: LAYER.shadow.y * t.scale, blur: LAYER.shadow.blur * t.scale } }, qr, t.scale);
  ctx.restore();
}
