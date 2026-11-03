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

// The falling leaf's pace (LO1 / LO2 v3, handover centium/LOADING.md) and
// LO2's lockup geometry, here because they are pure.
//
// The fall runs on its own clock, advanced by real elapsed time: loading
// progress only decides when the leaf may land. Until loading is done (or
// the release time D), the fall holds at H of its length with a gentle sway.

/** One loader's fall timings, in seconds (LOADING.md "New timing model"). */
export interface Pace {
  /** The fall's designed length. */
  T: number;
  /** The share of the fall it holds at while loading is not done. */
  H: number;
  /** Released by this time whatever the loading progress. */
  D: number;
  /** A repeat visit's fall. */
  R: number;
}
export const LO1_PACE: Pace = { T: 1.9, H: 0.86, D: 2.13, R: 0.32 };
/** LO2's repeat visit keeps its own 0.5 s glide path, so R is never read. */
export const LO2_PACE: Pace = { T: 1.2, H: 0.86, D: 1.43, R: 1 };

/** The fall's running state: u the fall progress, c its clock, a the last
 *  frame's time, sw the smoothed sway amplitude, hs the hold start. */
export interface PaceState {
  u: number;
  c: number;
  a: number;
  sw: number;
  hs: number | null;
  /** This frame's sway, from -1 to 1 (times 3% of the width and 9 degrees). */
  sway: number;
}
export const newPace = (): PaceState => ({ u: 0, c: 0, a: 0, sw: 0, hs: null, sway: 0 });

/**
 * One frame of the fall (LOADING.md steps 2 to 5). `p` is seconds since the
 * clock start, `h` the loading progress (0 to 1), `skip` true once the visitor
 * scrolled or pressed a key. Returns the fall progress u.
 */
export function paceStep(S: PaceState, p: number, h: number, mode: LoaderMode, skip: boolean, K: Pace): number {
  const dt = Math.max(0, p - S.a);
  S.a = p;
  if (skip) {
    S.u += (1 - S.u) * (1 - Math.exp(-dt * 30));
    if (1 - S.u < 0.002) S.u = 1;
    S.sw = 0;
    S.sway = 0;
    return S.u;
  }
  if (mode === "repeat") {
    S.c += dt;
    S.u = Math.min(1, S.c / K.R);
    S.sway = 0;
    return S.u;
  }
  const hold = K.H * K.T,
    free = h >= 1 || p >= K.D;
  S.c += dt;
  if (!free && S.c > hold) {
    S.c = hold;
    if (S.hs == null) S.hs = p;
  }
  const target = !free && S.hs != null ? Math.min(1, (p - S.hs) / 0.4) : 0;
  S.sw += (target - S.sw) * (1 - Math.exp(-dt * 6));
  S.sway = S.sw * Math.sin(((p - (S.hs ?? 0)) * Math.PI * 2) / 1.6);
  S.u = Math.min(1, S.c / K.T);
  return S.u;
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
