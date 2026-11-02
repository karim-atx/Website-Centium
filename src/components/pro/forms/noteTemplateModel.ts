// Release 3 · W6 MO21 Note templates: note_templates holds a title and a
// body (text, ≤ 10,000). A template's "sections" are headings in the body,
// one per line, each ending with a colon and followed by an empty line to
// write under; that's what the client page's note picker (W3 NotesTab)
// pastes into a new note. A body that isn't only headings is edited as plain
// text. Section types (short text, exercise list, scale) and "used n times"
// have no column, so they aren't shown. Pure.

import { t, tn } from "../../../i18n/core";

export const NOTE_TITLE_MAX = 80;
export const NOTE_BODY_MAX = 10000;
export const SECTION_MAX = 80;

/** The headings, or null when the body is free text. */
export function sectionsOf(body: string): string[] | null {
  const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  if (!lines.every((l) => l.endsWith(":") && l.length > 1)) return null;
  return lines.map((l) => l.slice(0, -1).trim());
}

/** "How it went:\n\nNext time:\n" from the headings. */
export function bodyOf(sections: string[]): string {
  return sections
    .map((s) => s.trim().replace(/:+$/, ""))
    .filter(Boolean)
    .map((s) => `${s}:\n`)
    .join("\n");
}

export function templateMeta(body: string): string {
  const s = sectionsOf(body);
  if (s === null) return t("Free text");
  return tn(s.length, "{n} section", "{n} sections");
}
