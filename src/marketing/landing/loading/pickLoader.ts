// Centium landing v29: which loading sequence a page load gets (prototype
// `pickLo`, handover 03_motion/01-loading-LO1-LO2.md), ported literally with
// the storage keys renamed under a `centium-landing:` prefix (outside the
// app's own `centium-state:` keys).
//
// - LO1 (the leaf becomes the dot of "lives"): only at the top of the landing.
// - LO2 (leaf, the C, the wordmark): anchors, mid-page reloads, Contact, Legal, 404.
// - None: back/forward, and any later page of the same visit.
// Production differences from the prototype: its QA flags (lft, lo, visit,
// at, only, still) are not ported, and in this single-page app only the
// FIRST marketing route a document renders can get a loader; every later
// client-side navigation is "in-site", as the prototype's full page loads
// within one visit are.

import { reducedMotion } from "../engine/env";
import { getLanguage } from "../../../i18n/core";
import { chooseLoader, pageOf, type LoaderEntry, type MarketingPage } from "./loaderChoice";

export { anchorHash, pageOf, type LoaderEntry, type LoaderKind, type LoaderMode, type MarketingPage } from "./loaderChoice";

export const KEY_RETURNING = "centium-landing:returning";
export const KEY_SESSION = "centium-landing:session";
export const KEY_Y = "centium-landing:y";

function navigationType(): string | undefined {
  try {
    const nav = performance.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined;
    return nav?.type;
  } catch {
    return undefined;
  }
}

/** The prototype's pickLo for one page load: reads the browser state, decides with chooseLoader. */
export function pickLoader(page: MarketingPage, hash: string): LoaderEntry {
  let saved: { page?: string; y?: number } | null = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(KEY_Y) || "null");
  } catch {
    /* storage blocked */
  }
  let returning = false,
    inSession = false;
  try {
    returning = !!localStorage.getItem(KEY_RETURNING);
    inSession = !!sessionStorage.getItem(KEY_SESSION);
  } catch {
    /* storage blocked */
  }
  const entry = chooseLoader({ page, hash, navType: navigationType(), saved, returning, inSession, rm: reducedMotion() });
  // Round F: LO1 lands the leaf as the dot of the i in "lives", which only the
  // English intro title has (the Arabic title is split into whole words, with
  // no dotless i to land on), so an Arabic visit gets LO2 (leaf, C, wordmark).
  if (entry.kind === "lo1" && getLanguage() === "ar") return { ...entry, kind: "lo2", why: entry.why + " (Arabic: no dot to land on)" };
  return entry;
}

const entries = new Map<string, LoaderEntry>();
let firstRoute = true;

/** The entry for one router location (by its key), computed once and cached
 *  so every component reads the same answer across re-renders. Only the first
 *  marketing route of this document can get a loader; every later one, and
 *  that first route again once its loader has run, is "in-site". */
export function loaderEntryFor(locationKey: string, pathname: string, hash: string): LoaderEntry {
  const hit = entries.get(locationKey);
  if (hit) return hit;
  const page = pageOf(pathname);
  const entry: LoaderEntry =
    firstRoute && typeof window !== "undefined"
      ? pickLoader(page, hash)
      : { kind: null, mode: reducedMotion() ? "rm" : "first", at: null, why: "in-site", page };
  firstRoute = false;
  entries.set(locationKey, entry);
  return entry;
}

/** Once a route's loader has run, coming back to that history entry gets none. */
export function consumeLoaderEntry(locationKey: string) {
  const hit = entries.get(locationKey);
  if (hit && (hit.kind || hit.at != null)) entries.set(locationKey, { ...hit, kind: null, at: null, why: "in-site" });
}

/** The prototype's `flags()`: this visit has seen the site; later visits get the short loader. */
export function markVisited() {
  try {
    sessionStorage.setItem(KEY_SESSION, "1");
    localStorage.setItem(KEY_RETURNING, "1");
  } catch {
    /* storage blocked */
  }
}

/** The prototype's `keepY` (pagehide / beforeunload): where this page was, for a reload. */
export function keepY(page: MarketingPage) {
  try {
    sessionStorage.setItem(KEY_Y, JSON.stringify({ page, y: Math.round(window.scrollY) }));
  } catch {
    /* storage blocked */
  }
}
