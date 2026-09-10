// Diagnostics for the intermittent consent-toggle non-persistence bug.
//
// OBSERVABILITY ONLY. Nothing here changes what a toggle does. It exists
// because the bug has survived two dedicated reproduction attempts — 18 runs,
// zero divergences — and three real sightings that left no evidence beyond
// "it happened". The next occurrence should be diagnosable from a console log
// rather than needing to be caught live again.
//
// TWO MECHANISMS ARE ALREADY RULED OUT and this deliberately does not re-prove
// them: the "Saved" checkmark cannot appear without a successful write
// (forcing every consent PATCH to 403 produced no checkmark, a reverted switch
// and a visible error), and the same-tick double-click race was shown
// idempotent. What is left to distinguish is mainly whether the click reaches
// the handler at all.
//
// THE MOST IMPORTANT LINE THIS PRODUCES IS THE ONE THAT IS MISSING. If the
// click never reaches the handler, nothing is logged — and that absence is the
// finding. It only means anything if a normal, working toggle reliably logs,
// which is why success is logged as well as failure.
//
// A MODULE RATHER THAN COMPONENT-LOCAL STATE, for a mundane reason worth
// writing down: `Date.now()` read inside a component body trips the
// react(purity) lint rule, and suppressing it to keep timing code in the
// component would have been the wrong trade. Module scope is also correct on
// its own terms — the counter is a log sequence, not UI state, and nothing
// renders from it.
//
// LEVEL IS console.info, WHICH IS THIS CODEBASE'S FIRST NON-ERROR LOGGING.
// Everything else logs only at warn or error, deliberately. A successful
// toggle is not a problem, so error would be wrong, and debug is hidden by
// default in most consoles — which would defeat the point, since the evidence
// has to be there in a session nobody thought to instrument in advance.

const PREFIX = "[consent-toggle]";

let sequence = 0;
let openedAt = Date.now();
let lastAttemptAt: number | null = null;

export interface ToggleAttempt {
  /** Pairs the "attempt" line with its "outcome" line. */
  id: number;
  startedAt: number;
  msSinceOpened: number;
  msSinceLastAttempt: number | null;
}

/**
 * Resets the timing baseline. Called when the sharing UI mounts, so
 * `msSinceOpened` measures from the sheet opening rather than from page load.
 */
export function markSharingOpened(): void {
  openedAt = Date.now();
  lastAttemptAt = null;
}

/** Allocates the id and timings for one toggle, before anything can bail out. */
export function beginToggleAttempt(): ToggleAttempt {
  const startedAt = Date.now();
  const msSinceLastAttempt = lastAttemptAt === null ? null : startedAt - lastAttemptAt;
  lastAttemptAt = startedAt;
  sequence += 1;
  return { id: sequence, startedAt, msSinceOpened: startedAt - openedAt, msSinceLastAttempt };
}

/** How long the write took, kept here so no component reads the clock. */
export function elapsedSince(attempt: ToggleAttempt): number {
  return Date.now() - attempt.startedAt;
}

/**
 * One line. `event` is the first thing after the prefix so a console filtered
 * to `[consent-toggle]` reads as a sequence at a glance.
 *
 * An "attempt" with no matching "outcome" is a request that never settled,
 * which is a different fault from one that resolved with an error — and
 * neither would be distinguishable from a single line written after the await.
 */
export function logToggle(
  event: "attempt" | "outcome" | "skipped",
  detail: Record<string, unknown>
): void {
  console.info(`${PREFIX} ${event}`, detail);
}
