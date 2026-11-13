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

/**
 * The state for this open. Call once per open (the popup's open false → true),
 * and only for an eligible popup (RULE B3), so a popup that shows no Tio does
 * not advance the stored state.
 */
export function nextTioState(v: TioViewport, random: () => number = Math.random, store: Store | null = storage()): TioState {
  let last: string | null = null;
  try {
    last = store?.getItem(tioKey(v)) ?? null;
  } catch {
    last = null;
  }
  const all: readonly TioState[] = TIO_STATES[v];
  const pool = all.filter((s) => s !== last);
  const pick = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  try {
    store?.setItem(tioKey(v), pick);
  } catch {
    // Private mode or full storage: the pick still stands for this open.
  }
  return pick;
}
