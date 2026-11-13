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

// The last state is kept in localStorage (shared by every popup, across
// sessions). Where localStorage is unavailable (a private window that refuses
// it, blocked storage), it is kept in memory for this tab instead, so the
// rotation still works for the session rather than Tio being hidden.
const memory = new Map<string, string>();
const local = (): Store | null => {
  try {
    return (globalThis as { localStorage?: Store }).localStorage ?? null;
  } catch {
    return null;
  }
};
const sessionStore: Store = {
  getItem(key) {
    try {
      const v = local()?.getItem(key);
      if (v !== null && v !== undefined) return v;
    } catch {
      // Unavailable: memory below.
    }
    return memory.get(key) ?? null;
  },
  setItem(key, value) {
    memory.set(key, value);
    try {
      local()?.setItem(key, value);
    } catch {
      // Unavailable: memory keeps it for this tab.
    }
  },
};
function storage(): Store {
  return sessionStore;
}

/** Where the rotation's last state lives on this device: "localStorage", or "memory" for this tab. */
export function tioStorageKind(): "localStorage" | "memory" {
  try {
    const ls = local();
    if (!ls) return "memory";
    ls.setItem("centium.tio.probe", "1");
    return "localStorage";
  } catch {
    return "memory";
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

/**
 * This open's state among those that fit (Safari fix): the last state left
 * out, then only the states whose pose has room (`fits`; NONE always has),
 * equally likely. null when none of them fits (the last state was NONE and
 * no pose has room): no Tio on this open, and nothing is stored.
 */
export function pickFittingTioState(
  v: TioViewport,
  fits: (s: TioState) => boolean,
  random: () => number = Math.random,
  store: Store | null = storage()
): TioState | null {
  let last: string | null = null;
  try {
    last = store?.getItem(tioKey(v)) ?? null;
  } catch {
    last = null;
  }
  const all: readonly TioState[] = TIO_STATES[v];
  const pool = all.filter((s) => s !== last && fits(s));
  if (!pool.length) return null;
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
