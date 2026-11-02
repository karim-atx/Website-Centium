// Round G3 · the doctor summary's PDF pages, laid out without a browser (the
// pure half: wrapping and pagination with a given text measure), so the
// tests read it directly. summaryPdf.ts paints these pages on a canvas and
// puts them in a PDF on the device, as the share cards are drawn: nothing is
// uploaded, and Arabic is shaped by the browser as it is on screen.

export type BlockKind = "title" | "subtitle" | "notice" | "heading" | "line" | "empty";

export interface Block {
  kind: BlockKind;
  text: string;
}

export interface PlacedLine {
  kind: BlockKind;
  text: string;
  /** Baseline, in px from the page top. */
  y: number;
}

export interface LayoutOptions {
  width: number;
  height: number;
  margin: number;
  /** Space kept at the bottom for the footer line. */
  footer: number;
  size: Record<BlockKind, number>;
  /** Line height as a multiple of the font size. */
  leading: number;
  /** Extra space before a block of this kind. */
  before: Partial<Record<BlockKind, number>>;
}

/** Words onto lines no wider than `max`; a word longer than a line is broken by characters. */
export function wrap(text: string, max: number, measure: (s: string) => number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = "";
  const push = (w: string) => {
    if (measure(w) <= max) return w;
    // A very long word: break it so it never runs off the page.
    let part = "";
    for (const ch of w) {
      if (measure(part + ch) > max && part) {
        out.push(part);
        part = ch;
      } else part += ch;
    }
    return part;
  };
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (measure(next) <= max) {
      line = next;
      continue;
    }
    if (line) out.push(line);
    line = push(w);
  }
  if (line) out.push(line);
  return out.length ? out : [""];
}

/**
 * The blocks onto pages. A heading never sits alone at the foot of a page:
 * it moves to the next one with its first line.
 */
export function layoutPages(blocks: readonly Block[], o: LayoutOptions, measure: (s: string, kind: BlockKind) => number): PlacedLine[][] {
  const pages: PlacedLine[][] = [[]];
  const bottom = o.height - o.margin - o.footer;
  const max = o.width - 2 * o.margin;
  let y = o.margin;
  const lh = (k: BlockKind) => o.size[k] * o.leading;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const lines = wrap(b.text, max, (s) => measure(s, b.kind));
    const gap = pages[pages.length - 1].length ? (o.before[b.kind] ?? 0) : 0;
    // A heading needs room for itself and the first line after it.
    const next = blocks[i + 1];
    const keep = b.kind === "heading" && next ? lh(next.kind) : 0;
    if (y + gap + lh(b.kind) + keep > bottom && pages[pages.length - 1].length) {
      pages.push([]);
      y = o.margin;
    } else y += gap;
    for (const text of lines) {
      if (y + lh(b.kind) > bottom && pages[pages.length - 1].length) {
        pages.push([]);
        y = o.margin;
      }
      y += lh(b.kind);
      pages[pages.length - 1].push({ kind: b.kind, text, y: y - (lh(b.kind) - o.size[b.kind]) / 2 });
    }
  }
  return pages;
}
