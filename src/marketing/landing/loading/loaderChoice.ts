// Centium landing v29: the pure part of the prototype's `pickLo` (handover
// 03_motion/01-loading-LO1-LO2.md), with no browser access, so it can be
// unit-tested. pickLoader.ts gathers the browser state and calls it.

export type MarketingPage = "home" | "contact" | "legal" | "404";
export type LoaderKind = "lo1" | "lo2" | null;
export type LoaderMode = "rm" | "repeat" | "first";

export interface LoaderEntry {
  kind: LoaderKind;
  mode: LoaderMode;
  /** A saved scroll position to restore on a reload (prototype `at`). */
  at: number | null;
  why: string;
  page: MarketingPage;
}

export interface LoaderInputs {
  page: MarketingPage;
  hash: string;
  /** performance navigation type: navigate | reload | back_forward | prerender. */
  navType: string | undefined;
  /** The position saved on pagehide (centium-landing:y). */
  saved: { page?: string; y?: number } | null;
  /** centium-landing:returning (localStorage). */
  returning: boolean;
  /** centium-landing:session (sessionStorage). */
  inSession: boolean;
  rm: boolean;
}

export function pageOf(pathname: string): MarketingPage {
  if (pathname === "/") return "home";
  if (pathname === "/contact") return "contact";
  if (pathname === "/legal") return "legal";
  return "404";
}

/** A hash that names an element id (#platform), not an auth return (#error=..., #access_token=...). */
export function anchorHash(hash: string): string | null {
  return /^#[A-Za-z][\w-]*$/.test(hash) ? hash.slice(1) : null;
}

/** The prototype's pickLo decision, minus its QA flags. */
export function chooseLoader(i: LoaderInputs): LoaderEntry {
  const { page, hash, navType, saved, returning, inSession, rm } = i;
  const mode: LoaderMode = rm ? "rm" : returning ? "repeat" : "first";
  const at = navType === "reload" && saved && saved.page === page && (saved.y ?? 0) > 40 ? (saved.y as number) : null;
  const ent = { at, page };
  if (navType === "back_forward") return { ...ent, kind: null, mode, why: "back" };
  if (inSession && navType !== "reload") return { ...ent, kind: null, mode, why: "in-site" };
  if (page !== "home") return { ...ent, kind: "lo2", mode, why: "page " + page };
  if (anchorHash(hash)) return { ...ent, kind: "lo2", mode, why: "anchor " + hash };
  if (at != null && at > 40) return { ...ent, kind: "lo2", mode, why: "mid-page " + Math.round(at) };
  return { ...ent, kind: "lo1", mode, why: "top of the landing page" };
}

// The falling leaf's progress targets (prototype lo1Target / loTarget) and
// LO2's lockup geometry, here because they are pure.

/** LO1 fall progress target: real progress paced to at least 1.9 s, forced to land by 2.4 s (repeat visits: 0.32 s). */
export function lo1Target(t: number, real: number, mode: LoaderMode): number {
  if (mode === "repeat") return Math.min(1, t / 0.32);
  return Math.max(Math.min(real, t / 1.9), Math.pow(Math.min(1, Math.max(0, (t - 1.9) / 0.5)), 1.6));
}

/** LO2 fall progress target: real progress paced to at least 1.2 s, forced by 1.6 s. */
export function loTarget(t: number, real: number): number {
  return Math.max(Math.min(real, t / 1.2), Math.pow(Math.min(1, Math.max(0, (t - 1.15) / 0.45)), 1.6));
}

/** The full lockup's width in mark widths. The prototype's traced lockup was
 *  4.5399; this build draws the official one with the navbar's own geometry
 *  (28px mark, 10.9px gap, 100.42 x 11px wordmark), so the lockup that glides
 *  into the navbar lands exactly on the navbar logo. */
export const LOCKUP_RATIO = (28 + 10.9 + 100.42) / 28;

/** LO2 word geometry: where the ENTIUM letters sit, in the official wordmark's
 *  own units (viewBox 204 44 849 93): ink from y 50 to 130. Each letter's
 *  clip rect grows up from LETTER_BASE by LETTER_H (the prototype's traced
 *  letters grew from 1024 by 60 in theirs). */
export const LETTER_BASE = 131;
export const LETTER_H = 81;
