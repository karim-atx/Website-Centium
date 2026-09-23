// Diagnostics for the intermittent consent-toggle non-persistence bug.
//
// OBSERVABILITY ONLY. Nothing here changes what a toggle does. It exists
// because the bug has survived two dedicated reproduction attempts — 18 runs,
// zero divergences — and three real sightings that left no evidence beyond
// "it happened". The next occurrence should be diagnosable from a console log
// rather than needing to be caught live again.
//
// THE BUG THIS WAS BUILT FOR HAS SINCE BEEN FOUND, and the finding is why the
// `unsettled` line below exists. The write was an ordinary fetch, so a page
// unload mid-flight cancelled it: the attempt was logged, the request went out,
// and nothing ever came back. The row was left unchanged with no error, no
// confirmation and no evidence. Reproduced by delaying the consent PATCH to
// staging's real latency (~213 ms median, against ~5 ms locally — which is why
// eighteen local runs found nothing) and reloading 200 ms into it.
//
// THAT WAS A THIRD CASE the original reasoning did not have. It read as a
// binary: a checkmark during a failure would mean the confirmation was lying,
// and no checkmark would mean the click never reached the handler. It can also
// mean the click reached the handler perfectly and the page was torn down
// before the answer arrived.
//
// TWO MECHANISMS ARE ALREADY RULED OUT and this deliberately does not re-prove
// them: the "Saved" checkmark cannot appear without a successful write
// (forcing every consent PATCH to 403 produced no checkmark, a reverted switch
// and a visible error), and the same-tick double-click race was shown
// idempotent.
//
// THE MOST IMPORTANT LINE THIS PRODUCES IS STILL THE ONE THAT IS MISSING. If
// the click never reaches the handler, nothing is logged — and that absence is
// the finding. It only means anything if a normal, working toggle reliably
// logs, which is why success is logged as well as failure.
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
 * Attempts that have been logged and not yet answered, keyed by attempt id.
 *
 * Module scope for the same reason the counter is: this is log bookkeeping,
 * nothing renders from it, and it has to outlive any component that unmounts
 * mid-write.
 */
const openAttempts = new Map<number, { detail: Record<string, unknown>; loggedAt: number }>();

/**
 * One line. `event` is the first thing after the prefix so a console filtered
 * to `[consent-toggle]` reads as a sequence at a glance.
 *
 * An "attempt" with no matching "outcome" is a request that never settled,
 * which is a different fault from one that resolved with an error — and
 * neither would be distinguishable from a single line written after the await.
 */
export function logToggle(
  event: "attempt" | "outcome" | "skipped" | "unsettled",
  detail: Record<string, unknown>
): void {
  const id = detail.attempt;
  if (typeof id === "number") {
    if (event === "attempt") openAttempts.set(id, { detail, loggedAt: Date.now() });
    else if (event === "outcome") openAttempts.delete(id);
  }
  console.info(`${PREFIX} ${event}`, detail);
}

/**
 * Says out loud, on the way out, that a write was still in the air.
 *
 * AN `unsettled` LINE IS NOT PROOF THE WRITE WAS LOST, and reading it that way
 * would send the next investigation somewhere wrong. It means only that this
 * page stopped being able to hear the answer. During the investigation one
 * such request had already been processed by the server and landed correctly —
 * the row was written, the tab simply never saw the 200. With keepalive on the
 * consent paths that is now the expected outcome rather than the lucky one.
 *
 * So treat it as a pointer to the reconciliation check, not a verdict: the
 * pending-change record written before the request is what actually decides
 * whether anything was lost, on the next load.
 *
 * `pagehide` rather than `beforeunload`: it fires on the paths that actually
 * lose requests, including a tab being closed and a mobile browser evicting a
 * backgrounded page, and it does not suppress the browser's back/forward
 * cache the way a beforeunload handler does.
 */
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    for (const [id, { detail, loggedAt }] of openAttempts) {
      logToggle("unsettled", {
        ...detail,
        attempt: id,
        msInFlight: Date.now() - loggedAt,
        note: "page unloaded before the write answered — check reconciliation on next load, not proof of loss",
      });
    }
    openAttempts.clear();
  });
}
