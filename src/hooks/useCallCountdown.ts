import { useEffect, useRef, useState } from "react";

/**
 * Seconds left before a call hits its duration cap.
 *
 * WALL-CLOCK DELTA, NOT TICK ACCUMULATION, and this is the one decision in the
 * file that matters. Two timers in this codebase get it wrong in the same way:
 * MeditationSheet adds 100 to a counter every 100ms, WorkoutSessionSheet adds 1
 * every second. Both count TICKS and call the result TIME. Browsers clamp
 * background-tab timers to a second or more and throttle harder the longer a
 * tab stays hidden, so both silently undercount — a call would run past its cap
 * believing it had minutes left. useVoiceRecorder is the one that gets it
 * right: it stores a start instant and recomputes `Date.now() - startedAt` on
 * every tick, so a throttled interval changes how often the number REFRESHES
 * and never what it says. That shape is copied here exactly.
 *
 * COUNTED FROM THE SERVER'S started_at, not from when this component mounted.
 * join-call-token stamps started_at inside the same transition that flips the
 * row to `answered`, so both clients are measuring the same call from the same
 * instant. Mounting time would differ between the two of them by the whole
 * round trip, and would reset if a component ever remounted mid-call.
 *
 * WAKES ON visibilitychange AND focus, following AppContext's day-rollover
 * effect, which registers both alongside its interval for the same reason: an
 * interval that has been throttled to once a minute leaves the number stale for
 * up to a minute after someone returns to the tab, and coming back is exactly
 * when it is being looked at.
 *
 * THIS IS NOT THE ENFORCEMENT. enforce-call-caps ends an over-running call
 * server-side; this only lets the user see it coming and end it gracefully
 * first. A client-side timer cannot bind anyone who controls their own client,
 * which is the same thing the README already records about the cap.
 */
export function useCallCountdown(
  startedAt: string | null,
  capSeconds: number,
  onExpired: () => void
): { secondsLeft: number | null; elapsedSeconds: number } {
  const [now, setNow] = useState(() => Date.now());

  // Held in a ref so an inline callback does not restart the interval on every
  // render.
  const onExpiredRef = useRef(onExpired);
  useEffect(() => {
    onExpiredRef.current = onExpired;
  });

  useEffect(() => {
    if (!startedAt) return;

    const tick = () => setNow(Date.now());
    tick();

    // 500ms so a whole second never visibly sticks; the displayed value is
    // derived from the clock either way, so this only sets refresh smoothness.
    const id = window.setInterval(tick, 500);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [startedAt]);

  const startedMs = startedAt ? new Date(startedAt).getTime() : NaN;
  // A malformed timestamp must not produce NaN and silently disable the cap.
  const running = startedAt !== null && !Number.isNaN(startedMs);

  const elapsedSeconds = running ? Math.max(0, Math.floor((now - startedMs) / 1000)) : 0;
  const secondsLeft = running ? Math.max(0, capSeconds - elapsedSeconds) : null;

  // FIRED FROM AN EFFECT, NOT FROM RENDER. Reaching zero is a transition, and
  // `hasExpired` only ever goes false -> true for one call, so this effect runs
  // its body exactly once — no ref guard, and nothing read during render.
  const hasExpired = secondsLeft !== null && secondsLeft <= 0;
  useEffect(() => {
    if (!hasExpired) return;
    onExpiredRef.current();
  }, [hasExpired]);

  return { secondsLeft, elapsedSeconds };
}

/** mm:ss, or h:mm:ss once a call passes an hour. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  return hours > 0
    ? `${hours}:${mm}:${String(seconds).padStart(2, "0")}`
    : `${mm}:${String(seconds).padStart(2, "0")}`;
}
