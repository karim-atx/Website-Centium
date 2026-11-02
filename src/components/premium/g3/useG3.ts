import { useCallback, useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { usePremium } from "../../../services/premium/hooks";
import { askPremium } from "../../../services/premium/asks";
import { fetchContentLines } from "../../../services/premium/g3Calls";
import { g3On, g3State, type ContentLines, type G3State } from "../../../services/premium/g3";
import type { PremiumFeature } from "../../../services/premium/features";

// Round G3 · reading a G3 call on screen. WITH THE SWITCH OFF, OR WHILE IT
// LOADS, NOTHING IS ASKED AND THE STATE IS "hidden": no entry point, card or
// route shows, and today's screens are untouched. A call answering ATXQ0 (or
// missing on a Database without G3) is "hidden" too.

/**
 * One G3 read. `key` re-reads when it changes (an id, a week); `reload()`
 * re-reads after a write. The answer applies only to the account and key it
 * was asked for.
 */
export function useG3<T>(fetcher: () => Promise<G3State<T>>, key: string, enabled = true): { state: G3State<T>; reload: () => void; patch: (fn: (v: T) => T) => void } {
  const { authUserId } = useApp();
  const { premium } = usePremium();
  const on = g3On(premium) && enabled && !!authUserId;
  const [answer, setAnswer] = useState<{ tag: string; state: G3State<T> } | null>(null);
  const [nonce, setNonce] = useState(0);
  const tag = `${authUserId}|${key}|${nonce}`;

  useEffect(() => {
    if (!on) return;
    let live = true;
    void fetcher().then((state) => live && setAnswer({ tag, state }));
    return () => {
      live = false;
    };
    // fetcher is rebuilt each render; the tag says when to ask again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, tag]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const patch = useCallback((fn: (v: T) => T) => setAnswer((a) => (a && a.state.kind === "ready" ? { tag: a.tag, state: { kind: "ready", value: fn(a.state.value) } } : a)), []);
  // A reload keeps the last answer on screen until the new one arrives.
  const mine = answer && (answer.tag === tag || answer.tag.startsWith(`${authUserId}|${key}|`)) ? answer.state : null;
  return { state: on ? g3State(premium, mine) : { kind: "hidden" }, reload, patch };
}

// ---- does this Database have G3? ----
//
// premium_content_lines() is the probe: the smallest G3 call, read once per
// session per account and shared (one call for every entry point on a page).
// Its answer also holds the lines every programme and session opens with.
// ATXQ0, a missing function (a Database without G3) or any failure: G3 is
// not there, and no entry point, card or route shows. A failure is not
// cached, so the next screen asks again.

type Probe = { lines: ContentLines | null; done: boolean };
const probes = new Map<string, { value: Probe; promise: Promise<Probe> }>();

function probe(userId: string): Promise<Probe> {
  const hit = probes.get(userId);
  if (hit) return hit.promise;
  const promise = fetchContentLines().then((s): Probe => {
    const value = { lines: s.kind === "ready" ? s.value : null, done: true };
    if (s.kind === "ready") probes.set(userId, { value, promise: Promise.resolve(value) });
    else probes.delete(userId);
    return value;
  });
  probes.set(userId, { value: { lines: null, done: false }, promise });
  return promise;
}

/** "yes" once the switch is on and the Database answers G3; "no" while off, without G3 or after a failure; "loading" until known. */
export function useG3Probe(): "loading" | "yes" | "no" {
  const { authUserId } = useApp();
  const { premium, loading } = usePremium();
  const on = g3On(premium) && !!authUserId;
  const cached = authUserId ? probes.get(authUserId)?.value : undefined;
  const [answer, setAnswer] = useState<{ userId: string; value: Probe } | null>(null);
  useEffect(() => {
    if (!on || !authUserId) return;
    let live = true;
    void probe(authUserId).then((value) => live && setAnswer({ userId: authUserId, value }));
    return () => {
      live = false;
    };
  }, [on, authUserId]);
  if (loading) return "loading";
  if (!on) return "no";
  const v = cached?.done ? cached : answer?.userId === authUserId ? answer.value : null;
  if (!v) return "loading";
  return v.lines ? "yes" : "no";
}

/** G3 shows: the switch on and the Database answering G3 (loading reads as no). */
export function useG3Available(): boolean {
  return useG3Probe() === "yes";
}

/** premium_content_lines(), once per session per account. Null until known (or hidden). */
export function useContentLines(): ContentLines | null {
  const { authUserId } = useApp();
  const yes = useG3Probe() === "yes";
  return yes && authUserId ? probes.get(authUserId)?.value.lines ?? null : null;
}

/** A tap on a locked row: the prompt (or the plain notice where prompts may not show). */
export const askLocked = (feature: PremiumFeature) => askPremium(feature, "tap");
