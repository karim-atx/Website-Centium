// Timers that survive the screen locking.
//
// NOTHING HERE COUNTS TICKS. A setInterval is throttled to once a minute in a
// backgrounded tab, stops entirely when the screen locks on iOS, and is never
// promised to fire on time in the first place — so a timer built by adding one
// per tick reads 4:12 after five minutes of a For Time, and an EMOM built that
// way drifts a little further behind every round.
//
// Every value below is DERIVED from a start timestamp and the current time.
// The interval that drives the re-render can miss as many beats as the browser
// likes; the number it renders is computed fresh and is therefore correct the
// instant the screen comes back.
//
// PAUSING IS AN ACCUMULATOR, not a stopped clock: `pausedMs` holds what was
// already banked, and `runningSince` is null while paused. Which is the same
// arrangement the session's own elapsed clock needs, and the reason this is a
// module rather than three copies inside three components.

export interface Stopwatch {
  /** Epoch ms when the current run began, or null while paused. */
  runningSince: number | null;
  /** Milliseconds banked before the current run. */
  pausedMs: number;
}

export const stoppedStopwatch = (): Stopwatch => ({ runningSince: null, pausedMs: 0 });

export const startedStopwatch = (now: number): Stopwatch => ({
  runningSince: now,
  pausedMs: 0,
});

export function elapsedMs(w: Stopwatch, now: number): number {
  return w.pausedMs + (w.runningSince == null ? 0 : Math.max(0, now - w.runningSince));
}

export const elapsedSeconds = (w: Stopwatch, now: number): number =>
  Math.floor(elapsedMs(w, now) / 1000);

export function pause(w: Stopwatch, now: number): Stopwatch {
  if (w.runningSince == null) return w;
  return { runningSince: null, pausedMs: elapsedMs(w, now) };
}

export function resume(w: Stopwatch, now: number): Stopwatch {
  if (w.runningSince != null) return w;
  return { runningSince: now, pausedMs: w.pausedMs };
}

export const isRunning = (w: Stopwatch): boolean => w.runningSince != null;

/**
 * What is left of a time cap, floored at zero.
 *
 * Returns whole seconds, rounded UP, so a countdown shows "1" for the whole of
 * the final second and reaches "0" exactly when the time is up — a floor would
 * show 0 for a second while the clock was still running.
 */
export function remainingSeconds(w: Stopwatch, capSeconds: number, now: number): number {
  return Math.max(0, Math.ceil(capSeconds - elapsedMs(w, now) / 1000));
}

export const capReached = (w: Stopwatch, capSeconds: number, now: number): boolean =>
  elapsedMs(w, now) >= capSeconds * 1000;

export interface IntervalPosition {
  /** 1-based, and clamped to `rounds` once the last interval has run out. */
  round: number;
  /** Seconds remaining in the current interval, rounded up as above. */
  remaining: number;
  /** True once every round's interval has elapsed. */
  done: boolean;
}

/**
 * Where an EMOM is: which round, and how long until the next one starts.
 *
 * DERIVED BY DIVISION, which is the whole point — a round counter incremented
 * by a timer callback falls behind by however long the phone was asleep, and
 * comes back claiming round 3 of a workout that is on round 11.
 */
export function intervalPosition(
  w: Stopwatch,
  intervalSeconds: number,
  rounds: number,
  now: number
): IntervalPosition {
  const total = intervalSeconds * rounds;
  const elapsed = elapsedMs(w, now) / 1000;
  if (elapsed >= total) return { round: rounds, remaining: 0, done: true };
  const index = Math.floor(elapsed / intervalSeconds);
  return {
    round: index + 1,
    remaining: Math.max(0, Math.ceil(intervalSeconds * (index + 1) - elapsed)),
    done: false,
  };
}
