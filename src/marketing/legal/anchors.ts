// The Legal page's structure (LG1 v17: one long page, prototype data7
// legalDocs / legalToc) and the deep links into it.
//
// Every document and every headed group has an id: `terms`, `privacy`,
// `health`, and `<doc>-<slug>` for a group (slug = the heading lower-cased,
// runs of anything else turned into "-", the rule the app's legalCopy.ts
// legalSlug and the handover's legalSlug share). So `/legal#privacy`,
// `/legal#terms` and `/legal#health` (the app's Settings, onboarding and the
// /legal/privacy, /legal/terms redirects) land directly.
//
// THE SHIM. The previous page navigated one subsection at a time through
// hashes shaped `#legal/<doc>/<slug>`, and the app still links that way (the
// in-app Privacy and Terms pages: legalCopy.ts legalHref, BR-11). It also took
// `#legal/<doc>`, `#legal` and `#<doc>/<slug>`. legalAnchorFor maps each of
// those to the id on the long page, and the page swaps the hash for it.

import { HEALTH_ITEMS, INTRO, LIABILITY_TEXT, PRIVACY_GROUPS, TERMS_GROUPS, type LegalGroup } from "./text";

export type DocKey = "terms" | "privacy" | "health";
export const DOC_KEYS: DocKey[] = ["terms", "privacy", "health"];

/** The slug of a heading (the handover's legalSlug, the app's legalCopy.ts legalSlug). */
export function legalSlug(h: string): string {
  return h
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface LegalDocGroup extends LegalGroup {
  id: string;
}

export interface LegalDoc {
  id: DocKey;
  num: string;
  title: string;
  /** The document's colour: its number and its bullets. */
  c: string;
  intro: string;
  /** The intro drawn in the lavender box (Health) rather than as a paragraph. */
  box: boolean;
  groups: LegalDocGroup[];
}

const withIds = (doc: DocKey, groups: LegalGroup[]): LegalDocGroup[] => groups.map((g) => ({ h: g.h, items: g.items, id: doc + "-" + legalSlug(g.h) }));

/** The three documents, in page order (prototype data7 docs). */
export const LEGAL_DOCS: LegalDoc[] = [
  {
    id: "terms",
    num: "01",
    title: "Terms of Service",
    c: "#775FD7",
    intro: INTRO.terms,
    box: false,
    groups: withIds("terms", TERMS_GROUPS.concat([{ h: "Liability", items: [LIABILITY_TEXT] }])),
  },
  { id: "privacy", num: "02", title: "Privacy Policy", c: "#457D79", intro: INTRO.privacy, box: false, groups: withIds("privacy", PRIVACY_GROUPS) },
  {
    id: "health",
    num: "03",
    title: "Health & Medical Disclaimer",
    c: "#775FD7",
    intro: INTRO.health,
    box: true,
    // "In detail": LG1's heading above the Health points (not legal text).
    groups: withIds("health", [{ h: "In detail", items: HEALTH_ITEMS }]),
  },
];

export interface TocEntry {
  t: string;
  h: string;
  /** A document (bold, dark) or one of its groups (indented, grey). */
  doc: boolean;
}

/** "On this page": each document, then its groups (Health lists none). */
export const LEGAL_TOC: TocEntry[] = LEGAL_DOCS.flatMap((d) => [
  { t: d.num + " " + d.title, h: "#" + d.id, doc: true },
  ...(d.id === "health" ? [] : d.groups.map((g) => ({ t: g.h, h: "#" + g.id, doc: false }))),
]);

/** Every id on the page a deep link can name. */
export const LEGAL_IDS: ReadonlySet<string> = new Set(LEGAL_DOCS.flatMap((d) => [d.id as string, ...d.groups.map((g) => g.id)]));

/** The id an old-shape legal hash points at, or null when the hash needs no
 *  rewrite (an id already, empty, or not a legal hash). `#legal/<doc>/<slug>`
 *  and `#<doc>/<slug>` go to `<doc>-<slug>` when that group exists, else to
 *  the document; `#legal/<doc>` to the document; `#legal` (or an unknown
 *  document) to the Terms, as the previous page did. */
export function legalAnchorFor(hash: string, ids: ReadonlySet<string> = LEGAL_IDS): string | null {
  const raw = (hash || "").replace(/^#/, "");
  if (!raw) return null;
  const parts = raw.split("/").filter(Boolean);
  let doc: string, sub: string | null;
  if (parts[0] === "legal") {
    doc = parts[1] || "terms";
    sub = parts[2] || null;
    if (!(DOC_KEYS as string[]).includes(doc)) {
      doc = "terms";
      sub = null;
    }
  } else if ((DOC_KEYS as string[]).includes(parts[0]) && parts.length > 1) {
    doc = parts[0];
    sub = parts[1];
  } else {
    return null;
  }
  return sub && ids.has(doc + "-" + sub) ? doc + "-" + sub : doc;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** The "Last updated" date for a legal version ("2026-09-06" -> "September 6, 2026", month first like the app). */
export function legalDateFor(version: string): string {
  const [y, m, d] = version.split("-").map(Number);
  return MONTHS[m - 1] + " " + d + ", " + y;
}
