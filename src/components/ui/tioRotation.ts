// Handover "Tio + Centium Fixes", B · RULE B2: which Tio a popup shows.
//
// Mobile: LIE / WAVE / PEEK / NONE (25% each). Website: LEAN / SIDEPEEK /
// NONE (33% each). A random pick every time a popup opens, never the same
// state twice in a row (NONE included): the last state shown is taken out of
// the pool, then the rest are equally likely. The last state is kept per
// viewport in localStorage, so it is shared by every popup and survives a
// reload and a new session (B spec §2 pseudocode).

export type TioViewport = "mobile" | "web";
export type MobileTioState = "lie" | "wave" | "peek" | "none";
export type WebTioState = "lean" | "sidepeek" | "none";
export type TioState = MobileTioState | WebTioState;

export const TIO_STATES = {
  mobile: ["lie", "wave", "peek", "none"],
  web: ["lean", "sidepeek", "none"],
} as const satisfies Record<TioViewport, readonly TioState[]>;

export const tioKey = (v: TioViewport) => `centium.tio.last.${v}`;

type Store = { getItem(key: string): string | null; setItem(key: string, value: string): void };

function storage(): Store | null {
  try {
    return (globalThis as { localStorage?: Store }).localStorage ?? null;
  } catch {
    return null;
  }
}

/** This open's candidate: the last state left out, the rest equally likely. Nothing is stored. */
export function pickTioState(v: TioViewport, random: () => number = Math.random, store: Store | null = storage()): TioState {
  let last: string | null = null;
  try {
    last = store?.getItem(tioKey(v)) ?? null;
  } catch {
    last = null;
  }
  const all: readonly TioState[] = TIO_STATES[v];
  const pool = all.filter((s) => s !== last);
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

/** Stores the state this open showed, so the next open avoids it. */
export function rememberTioState(v: TioViewport, s: TioState, store: Store | null = storage()): void {
  try {
    store?.setItem(tioKey(v), s);
  } catch {
    // Private mode or full storage: the pick still stands for this open.
  }
}

/**
 * The state for this open, stored. Call once per open (the popup's open false
 * → true), and only for an eligible popup (RULE B3), so a popup that shows no
 * Tio does not advance the stored state. BottomSheet picks and remembers in
 * two steps, so a pose with no room above the sheet (under the status bar on
 * a short phone) is dropped without advancing either.
 */
export function nextTioState(v: TioViewport, random: () => number = Math.random, store: Store | null = storage()): TioState {
  const pick = pickTioState(v, random, store);
  rememberTioState(v, pick, store);
  return pick;
}
