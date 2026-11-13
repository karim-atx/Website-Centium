/**
 * A repeating event's save, in any scope (saveRepeating). \`alertMessage\`: the
 * event saved but its alert did not ("Your event is saved, but its alert
 * couldn't be set."), and \`event\` is the row that was saved: the series ("all"),
 * the new series ("following") or the new one-off ("one" with a change an
 * occurrence can't carry). Generic over the row, so this file has no service
 * import and node --test can load it.
 */
export type RepeatingSaveResult<E> =
  | { ok: true; alertMessage?: string; event?: E }
  | { ok: false; message?: string };

type WriteResult<E> = { ok: true; event: E; alertMessage?: string } | { ok: false; message?: string };

/** An event write's result as a repeating save's, keeping a failed alert's message and the saved row. */
export function keepAlertResult<E>(r: WriteResult<E>): RepeatingSaveResult<E> {
  if (!r.ok) return r;
  return r.alertMessage ? { ok: true, alertMessage: r.alertMessage, event: r.event } : { ok: true };
}

/**
 * Where the sheet points after a repeating save whose alert failed, so "Save"
 * retries the alert on the row that was saved, as the one-off path does: the
 * same series keeps the tapped occurrence; a new series or one-off is edited
 * from its own first date.
 */
export function alertRetryTarget(seriesId: string, occurrence: string, saved: { id: string; date: string }): { id: string; occurrence: string } {
  return saved.id === seriesId ? { id: seriesId, occurrence } : { id: saved.id, occurrence: saved.date };
}

/**
 * The sheet's draft for that retry: the saved row's own repeat and end, so
 * retrying on the new one-off ("This event only") does not turn it back into
 * a series, and a new series keeps its own end. Everything else, the chosen
 * alert included, stays as the person left it.
 */
export function alertRetryDraft<D extends { repeat: string; repeatUntil?: string | null }>(
  draft: D,
  saved: { repeat: string; repeatUntil?: string | null }
): D {
  return { ...draft, repeat: saved.repeat, repeatUntil: saved.repeatUntil ?? null };
}
