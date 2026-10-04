import { useCallback, useEffect, useState } from "react";
import { AUTH_COOLDOWN_SECONDS, secondsLeft } from "../../services/auth/cooldown";

/**
 * A countdown started after a rate-limit refusal (services/auth/cooldown).
 * Ticks once a second while running; `left` is 0 when there is nothing to
 * wait for.
 */
export function useCooldown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until === 0) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) {
        setUntil(0);
        window.clearInterval(id);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [until]);

  const start = useCallback((seconds = AUTH_COOLDOWN_SECONDS) => {
    const t = Date.now();
    setNow(t);
    setUntil(t + seconds * 1000);
  }, []);

  const left = until === 0 ? 0 : secondsLeft(until, now);
  return { left, active: left > 0, start };
}
