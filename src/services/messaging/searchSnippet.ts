// The line a search result shows: a window of the message around the first
// match, split so the match can be highlighted. Pure, so it is tested in node.
//
// Case-insensitive like the database's ILIKE, and literal: the user's % and _
// are just characters here too.

export interface Snippet {
  before: string;
  match: string;
  after: string;
}

/** Characters of context kept before the match. */
const LEAD = 24;

export function snippetFor(text: string, query: string, maxLength = 90): Snippet {
  const flat = text.replace(/\s+/g, " ").trim();
  const q = query.trim();
  const at = q ? flat.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (at < 0) return { before: flat.slice(0, maxLength), match: "", after: flat.length > maxLength ? "…" : "" };
  const start = Math.max(0, at - LEAD);
  const end = Math.min(flat.length, Math.max(at + q.length, start + maxLength));
  return {
    before: (start > 0 ? "…" : "") + flat.slice(start, at),
    match: flat.slice(at, at + q.length),
    after: flat.slice(at + q.length, end) + (end < flat.length ? "…" : ""),
  };
}
