import { useCallback, useRef } from "react";

/**
 * Runs an async submit at most once at a time. A `busy` state flag alone
 * leaves a gap: two Enter presses (or Enter and a tap) can both land before
 * React re-renders with it set. The ref closes that gap synchronously.
 */
export function useSingleFlight() {
  const inFlight = useRef(false);
  return useCallback(async (fn: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await fn();
    } finally {
      inFlight.current = false;
    }
  }, []);
}
