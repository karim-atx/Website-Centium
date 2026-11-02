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

/** True once the switch is known to be on for me (loading reads as off). */
export function useG3On(): boolean {
  const { premium } = usePremium();
  return g3On(premium);
}

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

let linesCache: { userId: string; lines: ContentLines } | null = null;

/** premium_content_lines(), once per session per account. Null until known (or hidden). */
export function useContentLines(): ContentLines | null {
  const { authUserId } = useApp();
  const on = useG3On();
  const cached = linesCache && linesCache.userId === authUserId ? linesCache.lines : null;
  const { state } = useG3(fetchContentLines, "lines", !cached);
  useEffect(() => {
    if (state.kind === "ready" && authUserId) linesCache = { userId: authUserId, lines: state.value };
  }, [state, authUserId]);
  if (!on) return null;
  return cached ?? (state.kind === "ready" ? state.value : null);
}

/** A tap on a locked row: the prompt (or the plain notice where prompts may not show). */
export const askLocked = (feature: PremiumFeature) => askPremium(feature, "tap");
