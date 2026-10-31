// Round F (DN): reads a legal document written in the small Markdown subset
// the lawyer's files use (docs/legal/refund-policy*.md), so the page shows the
// confirmed text itself rather than a copy that can drift: a "# " title, the
// "Last updated" paragraph, paragraphs, "### " section headings, "- " lists,
// **bold** and *italic*. Links are added afterwards by exact phrase (F4), so
// no word of the text changes.

export type PolicyPiece = { t: string; b?: boolean; i?: boolean; href?: string };
export type PolicyBlock = { p: PolicyPiece[] } | { ul: PolicyPiece[][] };
export type PolicySection = { id: string; h: string; blocks: PolicyBlock[] };
export type PolicyDoc = { title: string; updated: string; intro: PolicyBlock[]; sections: PolicySection[] };

/** "**a** *b* c" → pieces; bold and italic don't nest in these files. */
export function parseInline(text: string): PolicyPiece[] {
  const out: PolicyPiece[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: text.slice(last, m.index) });
    out.push(m[1] !== undefined ? { t: m[1], b: true } : { t: m[2], i: true });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out;
}

export function parsePolicy(md: string): PolicyDoc {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let title = "";
  let updated = "";
  const intro: PolicyBlock[] = [];
  const sections: PolicySection[] = [];
  let list: PolicyPiece[][] | null = null;
  const target = () => (sections.length ? sections[sections.length - 1].blocks : intro);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      list = null;
      continue;
    }
    if (line.startsWith("# ")) {
      title = line.slice(2).trim();
      continue;
    }
    if (line.startsWith("### ")) {
      list = null;
      const h = line.slice(4).trim();
      const n = /^(\d+)\./.exec(h);
      sections.push({ id: n ? `section-${n[1]}` : `section-${sections.length + 1}`, h, blocks: [] });
      continue;
    }
    if (line.startsWith("- ")) {
      if (!list) {
        list = [];
        target().push({ ul: list });
      }
      list.push(parseInline(line.slice(2)));
      continue;
    }
    list = null;
    if (!updated && !sections.length && !intro.length) {
      updated = line;
      continue;
    }
    target().push({ p: parseInline(line) });
  }
  return { title, updated, intro, sections };
}

/** F4: turns each exact phrase into a link, splitting pieces; the words stay the same. */
export function linkPhrases(pieces: PolicyPiece[], links: [phrase: string, href: string][]): PolicyPiece[] {
  let out = pieces;
  for (const [phrase, href] of links) {
    const next: PolicyPiece[] = [];
    for (const p of out) {
      if (p.href || !p.t.includes(phrase)) {
        next.push(p);
        continue;
      }
      const parts = p.t.split(phrase);
      parts.forEach((part, i) => {
        if (part) next.push({ ...p, t: part });
        if (i < parts.length - 1) next.push({ ...p, t: phrase, href });
      });
    }
    out = next;
  }
  return out;
}

/** Every word of a document, in order: what a check compares between the file and the page. */
export function plainText(doc: PolicyDoc): string {
  const block = (b: PolicyBlock) => ("p" in b ? b.p.map((x) => x.t).join("") : b.ul.map((li) => li.map((x) => x.t).join("")).join("\n"));
  return [doc.title, doc.updated, ...doc.intro.map(block), ...doc.sections.flatMap((s) => [s.h, ...s.blocks.map(block)])].join("\n");
}
