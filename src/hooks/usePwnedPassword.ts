import { useEffect, useState } from "react";
import { tk } from "../i18n/core";
import { pwnedCount } from "../services/auth/pwnedPassword";

/** Round K (K-PW): the advice shown under a new password found in a known breach. */
export const PWNED_ADVICE = tk("This password has appeared in a known data breach. You can still use it, but a different one is safer.");

/** Wait this long after the last keystroke, so typing sends one request, not one per letter. */
const DEBOUNCE_MS = 700;

/**
 * Whether a NEW password being chosen is listed in Pwned Passwords. Advice
 * only: callers show PWNED_ADVICE and never block. Each change of the text
 * cancels the check before; a check that fails or times out answers false.
 * Never use this where an existing password is typed (sign-in, unlocks,
 * confirmations).
 */
export function usePwnedPassword(password: string): boolean {
  const [found, setFound] = useState<{ password: string; hit: boolean } | null>(null);
  useEffect(() => {
    if (!password) return;
    const ctl = new AbortController();
    const timer = window.setTimeout(() => {
      void pwnedCount(password, { signal: ctl.signal }).then((n) => {
        if (!ctl.signal.aborted) setFound({ password, hit: (n ?? 0) > 0 });
      });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      ctl.abort();
    };
  }, [password]);
  // An answer for an earlier text never shows against the current one.
  return !!found && found.password === password && found.hit;
}
