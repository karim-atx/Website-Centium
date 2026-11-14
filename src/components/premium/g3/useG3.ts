import { useCallback, useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { usePremium } from "../../../services/premium/hooks";
import { askPremium } from "../../../services/premium/asks";
import { fetchContentLines } from "../../../services/premium/g3Calls";
import { contentCacheKey, g3On, g3ProbeDecision, g3State, type ContentLines, type G3Probe, type G3State } from "../../../services/premium/g3";
import { accountLanguageSaved } from "../../../services/preferences/language";
import { getLanguage, t } from "../../../i18n/core";
import type { PremiumFeature } from "../../../services/premium/features";

// Round G3 · reading a G3 call on screen. WITH THE SWITCH OFF, OR WHILE IT
// LOADS, NOTHING IS ASKED AND THE STATE IS "hidden": no entry point, card or
// route shows, and today's screens are untouched. A call answering ATXQ0 (or
// missing on a Database without G3) is "hidden" too.
//
// THE CONTENT ANSWERS IN THE MEMBER'S LANGUAGE (app_preferences.language;
// G fixes 3): every answer is kept under the account AND the app language
// (contentCacheKey), and a read waits for a language change to be saved, so
// switching to Arabic never keeps the English copy.

/**
 * One G3 read. `key` re-reads when it changes (an id, a week), and so does
 * the app language; `reload()` re-reads after a write. The answer applies
 * only to the account, language and key it was asked for.
 */
export function useG3<T>(fetcher: () => Promise<G3State<T>>, key: string, enabled = true): { state: G3State<T>; reload: () => void; patch: (fn: (v: T) => T) => void } {
  const { authUserId } = useApp();
  const { premium } = usePremium();
  const on = g3On(premium) && enabled && !!authUserId;
  const [answer, setAnswer] = useState<{ tag: string; state: G3State<T> } | null>(null);
  const [nonce, setNonce] = useState(0);
  const base = contentCacheKey(authUserId, getLanguage(), key);
  const tag = `${base}|${nonce}`;

  useEffect(() => {
    if (!on) return;
    let live = true;
    void accountLanguageSaved()
      .then(() => fetcher())
      .then((state) => live && setAnswer({ tag, state }));
    return () => {
      live = false;
    };
    // fetcher is rebuilt each render; the tag says when to ask again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, tag]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const patch = useCallback((fn: (v: T) => T) => setAnswer((a) => (a && a.state.kind === "ready" ? { tag: a.tag, state: { kind: "ready", value: fn(a.state.value) } } : a)), []);
  // A reload keeps the last answer on screen until the new one arrives.
  const mine = answer && (answer.tag === tag || answer.tag.startsWith(`${base}|`)) ? answer.state : null;
  return { state: on ? g3State(premium, mine) : { kind: "hidden" }, reload, patch };
}

// ---- does this Database have G3? ----
//
// premium_content_lines() is the probe: the smallest G3 call, read once per
// session per account and language (its lines are content) and shared (one call for every entry point on a page).
// Its answer also holds the lines every programme and session opens with.
// ATXQ0, a missing function (a Database without G3) or any failure: G3 is
// not there, and no entry point or card shows. A failure is not cached, so
// the next screen asks again.
//
// Batch D GB · A ROUTE TELLS "no" FROM "error": a G3 route (G3Route) leaves
// only on the server's "no" (the switch off, or hidden); a failed or offline
// read, the probe's or my_premium's, keeps the member on the page with
// Retry. Before this, a failed read on a cold start from the Monday push
// silently sent the member to Home (g3ProbeDecision).

type Probe = { state: G3State<ContentLines>; done: boolean };
const probes = new Map<string, { value: Probe; promise: Promise<Probe> }>();

/** `at` is contentCacheKey(account, language). */
function probe(at: string): Promise<Probe> {
  const hit = probes.get(at);
  if (hit) return hit.promise;
  const promise = accountLanguageSaved()
    .then(() => fetchContentLines())
    .then((state): Probe => {
      const value = { state, done: true };
      if (state.kind === "ready") probes.set(at, { value, promise: Promise.resolve(value) });
      else probes.delete(at);
      return value;
    });
  probes.set(at, { value: { state: { kind: "loading" }, done: false }, promise });
  return promise;
}

/**
 * The probe with its failure message and a retry (re-reads my_premium when
 * that read failed, otherwise premium_content_lines()).
 */
export function useG3ProbeState(): { probe: G3Probe; message: string; retry: () => void } {
  const { authUserId } = useApp();
  const { premium, loading, failed, reload } = usePremium();
  const on = g3On(premium) && !!authUserId;
  const at = contentCacheKey(authUserId, getLanguage());
  const cached = authUserId ? probes.get(at)?.value : undefined;
  const [answer, setAnswer] = useState<{ at: string; value: Probe } | null>(null);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!on || !authUserId) return;
    let live = true;
    void probe(at).then((value) => live && setAnswer({ at, value }));
    return () => {
      live = false;
    };
  }, [on, authUserId, at, nonce]);
  const v = cached?.done ? cached : answer?.at === at ? answer.value : null;
  const content = v ? v.state : null;
  const decided = g3ProbeDecision({ loading, failed: !!authUserId && failed, on }, content);
  const message = content?.kind === "error" ? content.message : t("Couldn't load this. Try again.");
  const retry = useCallback(() => {
    if (failed) return reload();
    setAnswer(null);
    setNonce((n) => n + 1);
  }, [failed, reload]);
  return { probe: decided, message, retry };
}

/** "yes" once the switch is on and the Database answers G3; "no" while off or without G3; "error" after a failed read; "loading" until known. */
export function useG3Probe(): G3Probe {
  return useG3ProbeState().probe;
}

/** G3 shows: the switch on and the Database answering G3 (loading reads as no). */
export function useG3Available(): boolean {
  return useG3Probe() === "yes";
}

/** premium_content_lines(), once per session per account and language. Null until known (or hidden). */
export function useContentLines(): ContentLines | null {
  const { authUserId } = useApp();
  const yes = useG3Probe() === "yes";
  const hit = yes && authUserId ? probes.get(contentCacheKey(authUserId, getLanguage()))?.value.state : undefined;
  return hit?.kind === "ready" ? hit.value : null;
}

/** A tap on a locked row: the prompt (or the plain notice where prompts may not show). */
export const askLocked = (feature: PremiumFeature) => askPremium(feature, "tap");
