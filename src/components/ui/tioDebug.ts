// ?tioDebug=1: a small text readout on every bottom sheet saying why Tio is,
// or isn't, shown (height, eligibility, safe-area inset, the sheet's top, the
// pose picked). For checking on a real phone. Remembered for the tab
// (sessionStorage); ?tioDebug=0 turns it off. Without the parameter nothing
// shows and nothing changes for anyone.

const KEY = "centium.tioDebug";
// No DOM types here (node --test loads this file): the browser globals by shape.
type SessionStore = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };
const g = globalThis as { location?: { search: string }; sessionStorage?: SessionStore };
let on: boolean | null = null;

/** Read once, as early as possible (main.tsx), before a redirect drops the query. */
export function initTioDebug(): boolean {
  if (on !== null) return on;
  let q: string | null = null;
  try {
    q = new URLSearchParams(g.location?.search ?? "").get("tioDebug");
  } catch {
    q = null;
  }
  try {
    if (q === "1") g.sessionStorage?.setItem(KEY, "1");
    else if (q === "0") g.sessionStorage?.removeItem(KEY);
    on = q === "1" || (q !== "0" && g.sessionStorage?.getItem(KEY) === "1");
  } catch {
    on = q === "1";
  }
  return on;
}

export const tioDebugOn = (): boolean => (on === null ? initTioDebug() : on);

/** What one open decided, for the readout. */
export interface TioDebugInfo {
  viewport: "mobile" | "web";
  /** The mobile sheet height that decided eligibility (px), and how it was found. */
  height: number | null;
  measured: "panel" | "offscreen" | "cached" | "-";
  eligible: boolean | null;
  safeTop: number | null;
  sheetTop: number | null;
  /** The states that had room above the sheet. */
  fitting: string[];
  pose: string | null;
  storage: "localStorage" | "memory";
  reason: string;
}

export function tioDebugText(d: TioDebugInfo): string {
  const r = (n: number | null) => (n === null ? "-" : String(Math.round(n * 10) / 10));
  return [
    `Tio ${d.viewport}: ${d.pose ?? "not shown"}`,
    `height ${r(d.height)} (${d.measured}) eligible ${d.eligible === null ? "-" : d.eligible ? "yes" : "no"} (<= 668)`,
    `sheet top ${r(d.sheetTop)} safe-area top ${r(d.safeTop)}`,
    `fits: ${d.fitting.join(", ") || "-"} | storage ${d.storage}`,
    `why: ${d.reason}`,
  ].join("\n");
}

// The last decision per open sheet, published from BottomSheet's layout effect
// and read with useSyncExternalStore (so the effect sets no React state).
const decisions = new Map<string, TioDebugInfo>();
const listeners = new Set<() => void>();
export function publishTioDebug(sheet: string, info: TioDebugInfo | null): void {
  if (info) decisions.set(sheet, info);
  else decisions.delete(sheet);
  for (const l of listeners) l();
}
export function subscribeTioDebug(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export const tioDebugFor = (sheet: string): TioDebugInfo | null => decisions.get(sheet) ?? null;
