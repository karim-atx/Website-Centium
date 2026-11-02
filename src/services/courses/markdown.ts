// Round D (Database 20261223030000): lesson text is plain text with LIMITED
// Markdown, read into a small token tree that the lesson screens turn into
// React elements. Pure, so it is tested directly.
//
// WHAT IS UNDERSTOOD, and nothing else:
//   # / ## / ### headings;
//   **bold** (or __bold__) and *italic* (or _italic_);
//   "- " or "* " bulleted lists and "1. " numbered lists;
//   [text](https://...) links, http and https only;
//   a blank line between paragraphs; a single line break is kept.
//
// NO HTML, EVER. Nothing here produces markup: every token is text that React
// escapes, so "<b>" in a body shows as those three characters. The server
// already refuses HTML tags on a new or changed body (22023); a body stored
// before that is still shown safely. A link whose address isn't http(s) (a
// javascript: link, a relative path) shows its words without a link.

import { tk } from "../../i18n/core";

export type Inline =
  | { t: "text"; v: string }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "link"; href: string; c: Inline[] }
  | { t: "br" };

export type Block =
  | { t: "heading"; level: 1 | 2 | 3; c: Inline[] }
  | { t: "p"; c: Inline[] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; start: number; items: Inline[][] };

/** The short help line the editors show under a lesson's text box. */
export const FORMATTING_HELP = tk("You can use # Heading, **bold**, *italic*, - lists, 1. numbered lists and [links](https://…). HTML isn't allowed.");

/** An http or https address, normalised; null for anything else. */
export function safeHref(raw: string): string | null {
  const s = raw.trim();
  if (!/^https?:\/\//i.test(s)) return null;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

const ESCAPABLE = "\\`*_[]()#+-.!>";
const isWordChar = (ch: string | undefined) => !!ch && /[\p{L}\p{N}]/u.test(ch);

function pushText(out: Inline[], v: string) {
  if (!v) return;
  const last = out[out.length - 1];
  if (last && last.t === "text") last.v += v;
  else out.push({ t: "text", v });
}

/** The index of the closing delimiter for an emphasis run that opened at `from`, or -1. */
function findClose(s: string, from: number, delim: string): number {
  for (let i = from; i < s.length; i++) {
    if (s[i] === "\\") {
      i++;
      continue;
    }
    if (s.startsWith(delim, i) && i > from && s[i - 1] !== " ") {
      // A single * or _ must not be the start of a double one.
      if (delim.length === 1 && s[i + 1] === delim[0]) {
        i++;
        continue;
      }
      // "***" closing "**": the italic inside closes first, so the last two close the bold.
      if (delim.length === 2 && s[i + 2] === delim[0]) continue;
      // _ inside a word (snake_case) is not a closer.
      if (delim[0] === "_" && isWordChar(s[i + delim.length])) continue;
      return i;
    }
  }
  return -1;
}

/** Inline text: emphasis, links, escapes and line breaks. */
export function parseInline(s: string, depth = 0): Inline[] {
  const out: Inline[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === "\\" && i + 1 < s.length && ESCAPABLE.includes(s[i + 1])) {
      pushText(out, s[i + 1]);
      i += 2;
      continue;
    }
    if (ch === "\n") {
      out.push({ t: "br" });
      i++;
      continue;
    }
    if (depth < 4 && (ch === "*" || ch === "_")) {
      const double = s[i + 1] === ch;
      const delim = double ? ch + ch : ch;
      const opensInWord = ch === "_" && isWordChar(s[i - 1]);
      const next = s[i + delim.length];
      if (!opensInWord && next && next !== " " && next !== "\n") {
        const close = findClose(s, i + delim.length, delim);
        if (close > i + delim.length) {
          const inner = parseInline(s.slice(i + delim.length, close), depth + 1);
          out.push(double ? { t: "strong", c: inner } : { t: "em", c: inner });
          i = close + delim.length;
          continue;
        }
      }
    }
    if (depth < 4 && ch === "[") {
      const end = s.indexOf("](", i + 1);
      const close = end === -1 ? -1 : s.indexOf(")", end + 2);
      if (end > i + 1 && close > end + 2 && !s.slice(i + 1, end).includes("\n")) {
        const href = safeHref(s.slice(end + 2, close));
        const label = parseInline(s.slice(i + 1, end), depth + 1);
        if (href) out.push({ t: "link", href, c: label });
        else
          for (const part of label) {
            if (part.t === "text") pushText(out, part.v);
            else out.push(part);
          }
        i = close + 1;
        continue;
      }
    }
    pushText(out, ch);
    i++;
  }
  return out;
}

const HEADING = /^(#{1,3})\s+(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*(\d{1,4})[.)]\s+(.*)$/;

/** A lesson's text, as blocks. Never throws; empty text is no blocks. */
export function parseMarkdown(text: string | null | undefined): Block[] {
  const lines = (text ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ t: "p", c: parseInline(para.join("\n")) });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") {
      flush();
      continue;
    }
    const h = HEADING.exec(line.trim());
    if (h) {
      flush();
      blocks.push({ t: "heading", level: h[1].length as 1 | 2 | 3, c: parseInline(h[2].replace(/\s+#+\s*$/, "").trim()) });
      continue;
    }
    const b = BULLET.exec(line);
    const n = b ? null : NUMBERED.exec(line);
    if (b || n) {
      flush();
      const items: Inline[][] = [];
      const start = n ? Number(n[1]) : 1;
      let j = i;
      for (; j < lines.length; j++) {
        const m = b ? BULLET.exec(lines[j]) : NUMBERED.exec(lines[j]);
        if (!m) break;
        items.push(parseInline((b ? m[1] : m[2]).trim()));
      }
      i = j - 1;
      blocks.push(b ? { t: "ul", items } : { t: "ol", start, items });
      continue;
    }
    para.push(line);
  }
  flush();
  return blocks;
}

/** The text a block tree reads as, without its marks (for previews and tests). */
export function plainText(nodes: readonly Inline[]): string {
  return nodes.map((n) => (n.t === "text" ? n.v : n.t === "br" ? "\n" : plainText(n.c))).join("");
}

/** Whether the text holds an HTML tag the server would refuse (22023), checked before saving. Mirrors course_lessons_body_guard. */
export function hasHtmlTag(text: string): boolean {
  return /<\s*\/?\s*[a-z][a-z0-9-]*(\s[^<>]*)?\/?\s*>/i.test(text) || /<!--|<\?/.test(text);
}
