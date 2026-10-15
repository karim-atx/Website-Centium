import { useCallback, useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { fetchClientAccess, type AccessCategory, type ClientAccess } from "../services/pro/access";

/**
 * Release 3 · what one client shares with the signed-in professional, from
 * professional_client_access (DB-1). Every gated section asks `has(category)`
 * and renders LockLine when it is false, never a guess (HANDOVER k: rings and
 * charts never infer from unshared data).
 *
 * States, kept apart so a screen can say which one it is in:
 * - loading: no answer yet for this client;
 * - error / offline: the read failed. The last answer for this client is kept
 *   (`access` stays), so a screen can show "Offline, showing last update";
 * - notConnected: the answer was "no row" (not, or no longer, a client).
 *
 * Before an answer, `has` is false for everything: nothing is fetched or shown
 * on the strength of a switch the database hasn't confirmed.
 */
export interface UseClientAccess {
  access: ClientAccess | null;
  loading: boolean;
  error: boolean;
  offline: boolean;
  notConnected: boolean;
  has: (category: AccessCategory) => boolean;
  /** Imaging counts as shared when at least one imaging_shares row exists (decision 6). */
  imagingShared: boolean;
  retry: () => void;
}

export function useClientAccess(clientId: string | null | undefined): UseClientAccess {
  const { authUserId } = useApp();
  const [state, setState] = useState<{
    key: string;
    access: ClientAccess | null;
    answered: boolean;
    error: boolean;
    offline: boolean;
  } | null>(null);
  const [nonce, setNonce] = useState(0);
  const key = authUserId && clientId ? `${authUserId}:${clientId}` : "";

  useEffect(() => {
    if (!key || !clientId) return;
    let cancelled = false;
    void fetchClientAccess(clientId).then((r) => {
      if (cancelled) return;
      setState((prev) => {
        const kept = prev?.key === key ? prev : null;
        if (r.ok) return { key, access: r.data, answered: true, error: false, offline: false };
        return { key, access: kept?.access ?? null, answered: kept?.answered ?? false, error: true, offline: r.offline };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [key, clientId, nonce]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  const mine = state && state.key === key ? state : null;
  const access = mine?.access ?? null;
  const has = useCallback((c: AccessCategory) => !!access?.categories.includes(c), [access]);

  return {
    access,
    loading: !!key && !mine,
    error: !!mine?.error,
    offline: !!mine?.offline,
    notConnected: !!mine?.answered && !mine.error && !access,
    has,
    imagingShared: (access?.imagingSharedCount ?? 0) > 0,
    retry,
  };
}
