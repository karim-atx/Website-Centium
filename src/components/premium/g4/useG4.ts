import { useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { usePremium } from "../../../services/premium/hooks";
import { fetchColorThemes, fetchShareDesigns } from "../../../services/premium/g4Calls";
import { g4On, type ShareDesignRow, type ThemeAccessRow } from "../../../services/premium/g4";
import type { G3State } from "../../../services/premium/g3";

// Round G4 · does this Database have G4, and the two short lists read once
// per session per account (the share-card designs and the colour themes).
//
// member_share_card_designs() is the probe: the smallest G4 call. WITH THE
// SWITCH OFF, WHILE IT LOADS, ON A DATABASE WITHOUT G4 (a missing function)
// OR AFTER ANY FAILURE, G4 is "no": no entry point, card, route, swatch or
// design shows, and today's screens are untouched. A failure is not cached,
// so the next screen asks again.

type Cached<T> = { value: T | null; done: boolean };
type Store<T> = Map<string, { value: Cached<T>; promise: Promise<Cached<T>> }>;
const designs: Store<ShareDesignRow[]> = new Map();
const themes: Store<ThemeAccessRow[]> = new Map();

function once<T>(store: Store<T>, userId: string, fetcher: () => Promise<G3State<T>>): Promise<Cached<T>> {
  const hit = store.get(userId);
  if (hit) return hit.promise;
  const promise = fetcher().then((s): Cached<T> => {
    const value = { value: s.kind === "ready" ? s.value : null, done: true };
    if (s.kind === "ready") store.set(userId, { value, promise: Promise.resolve(value) });
    else store.delete(userId);
    return value;
  });
  store.set(userId, { value: { value: null, done: false }, promise });
  return promise;
}

/** Forgets the cached lists (after Premium changed), so the next screen reads again. */
export function invalidateG4(): void {
  designs.clear();
  themes.clear();
}

function useOnce<T>(store: Store<T>, fetcher: () => Promise<G3State<T>>): { state: "loading" | "no" | "yes"; value: T | null } {
  const { authUserId } = useApp();
  const { premium, loading } = usePremium();
  const on = g4On(premium) && !!authUserId;
  const cached = authUserId ? store.get(authUserId)?.value : undefined;
  const [answer, setAnswer] = useState<{ userId: string; value: Cached<T> } | null>(null);
  useEffect(() => {
    if (!on || !authUserId) return;
    let live = true;
    void once(store, authUserId, fetcher).then((value) => live && setAnswer({ userId: authUserId, value }));
    return () => {
      live = false;
    };
    // fetcher is a module function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, authUserId, store]);
  if (loading) return { state: "loading", value: null };
  if (!on) return { state: "no", value: null };
  const v = cached?.done ? cached : answer?.userId === authUserId ? answer.value : null;
  if (!v) return { state: "loading", value: null };
  return v.value ? { state: "yes", value: v.value } : { state: "no", value: null };
}

/** "yes" once the switch is on and the Database answers G4; "no" while off, without G4 or after a failure. */
export function useG4Probe(): "loading" | "yes" | "no" {
  return useOnce(designs, fetchShareDesigns).state;
}

/** G4 shows: the switch on and the Database answering G4 (loading reads as no). */
export function useG4Available(): boolean {
  return useG4Probe() === "yes";
}

/** member_share_card_designs(), or null while hidden or unknown. */
export function useShareDesigns(): ShareDesignRow[] | null {
  return useOnce(designs, fetchShareDesigns).value;
}

/** my_color_themes(), or null while the switch is off, loading or unknown. */
export function useColorThemeAccess(): ThemeAccessRow[] | null {
  const g4 = useG4Available();
  const r = useOnce(themes, fetchColorThemes);
  return g4 ? r.value : null;
}
