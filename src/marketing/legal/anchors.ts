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
import type * as ArabicText from "./text.ar";
import { documentFor, t, tk } from "../../i18n/core";
import { REFUND_POLICY_ID } from "./refund";

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

/** LG1 v5 (C15): the Health points under their five sub-headings, by point
 *  (1-2, 3, 4, 5-6, 7). `h` gives a heading's words (English, or t()). */
export const HEALTH_HEADINGS = [tk("Informational only"), tk("Biomarker capture"), tk("Voice and video calls"), tk("Independent providers"), tk("Not an emergency service")];
const HEALTH_SPLIT: [number, number?][] = [[0, 2], [2, 3], [3, 4], [4, 6], [6]];
function healthGroups(items: string[], h: (heading: string) => string): LegalGroup[] {
  return HEALTH_HEADINGS.map((heading, i) => ({ h: h(heading), items: items.slice(...HEALTH_SPLIT[i]) }));
}

const withIds = (doc: DocKey, groups: LegalGroup[]): LegalDocGroup[] => groups.map((g) => ({ h: g.h, items: g.items, id: doc + "-" + legalSlug(g.h) }));

/** The three documents, in page order (prototype data7 docs). */
export const LEGAL_DOCS: LegalDoc[] = [
  {
    id: "terms",
    num: "01",
    title: tk("Terms of Service"),
    c: "#775FD7",
    intro: INTRO.terms,
    box: false,
    groups: withIds("terms", TERMS_GROUPS.concat([{ h: "Liability", items: [LIABILITY_TEXT] }])),
  },
  { id: "privacy", num: "02", title: tk("Privacy Policy"), c: "#457D79", intro: INTRO.privacy, box: false, groups: withIds("privacy", PRIVACY_GROUPS) },
  {
    id: "health",
    num: "03",
    title: tk("Health & Medical Disclaimer"),
    c: "#775FD7",
    intro: INTRO.health,
    box: true,
    // LG1 v5 (C15): five sub-headings taken from the text group the Health
    // points (not legal text; the points are not changed or reordered).
    groups: withIds("health", healthGroups(HEALTH_ITEMS, (h) => h)),
  },
];

export interface TocEntry {
  t: string;
  h: string;
  /** A document (bold, dark) or one of its groups (indented, grey). */
  doc: boolean;
}

const tocOf = (docs: LegalDoc[]): TocEntry[] =>
  docs.flatMap((d) => [{ t: d.num + " " + d.title, h: "#" + d.id, doc: true }, ...d.groups.map((g) => ({ t: g.h, h: "#" + g.id, doc: false }))]);

/** "On this page": each document, then its groups (Health's five too, LG1 v5).
 *  The refund policy (04) is added by the page, from its own text. */
export const LEGAL_TOC: TocEntry[] = tocOf(LEGAL_DOCS);

/**
 * Round F (AV): the documents in the active language (call during render).
 * The same ids (from the English headings), numbers, colours and order; in
 * Arabic the words come from text.ar.ts, which has the same shape.
 */
export function legalDocsFor(): LegalDoc[] {
  const AR = documentFor<typeof ArabicText>("legal.text");
  if (!AR) return LEGAL_DOCS.map((d) => ({ ...d, title: t(d.title) }));
  const words: LegalGroup[][] = [
    AR.TERMS_GROUPS.concat([{ h: AR.LIABILITY_HEADING, items: [AR.LIABILITY_TEXT] }]),
    AR.PRIVACY_GROUPS,
    healthGroups(AR.HEALTH_ITEMS, t),
  ];
  return LEGAL_DOCS.map((d, i) => ({
    ...d,
    title: t(d.title),
    intro: AR.INTRO[d.id],
    groups: d.groups.map((g, j) => ({ id: g.id, h: words[i][j].h, items: words[i][j].items })),
  }));
}

/** "On this page" for legalDocsFor()'s documents. */
export const legalTocFor = (docs: LegalDoc[]): TocEntry[] => tocOf(docs);

/** Every id on the page a deep link can name. */
export const LEGAL_IDS: ReadonlySet<string> = new Set(LEGAL_DOCS.flatMap((d) => [d.id as string, ...d.groups.map((g) => g.id)]));

/** C14: the refund policy is section 04, `#refund-policy`, and its 14 sections
 *  `#refund-policy-1` to `#refund-policy-14` (the files' "### N." headings). */
export const refundSectionId = (n: number | string) => REFUND_POLICY_ID + "-" + n;
export const REFUND_IDS: ReadonlySet<string> = new Set([REFUND_POLICY_ID, ...Array.from({ length: 14 }, (_, i) => refundSectionId(i + 1))]);

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
