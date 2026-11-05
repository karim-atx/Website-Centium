// Round I · FB: values interpolated into a PostgREST or() filter string.
//
// or() takes one string in PostgREST's own grammar, where a comma starts the
// next condition and parentheses group them, so a value with a comma could
// add a condition of its own. Today every value placed there is the signed-in
// user's id or a timestamp the server returned, so nothing can be injected;
// these make that true by construction instead of by where the value came
// from. A value that isn't the expected shape becomes one that matches
// nothing, so the query still runs and returns nothing for it.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_ID = "00000000-0000-0000-0000-000000000000";

/** A uuid for an or() filter, or the nil uuid (matches no row) for anything else. */
export function filterId(id: string): string {
  return UUID.test(id) ? id : NO_ID;
}

// 2026-11-05T09:30:00.123456+00:00, ...Z, or with a space for the T.
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}(:?\d{2})?)?$/;
const EPOCH = "1970-01-01T00:00:00Z";

/** A timestamp for an or() filter, or the epoch (nothing is older) for anything else. */
export function filterTimestamp(at: string): string {
  return TIMESTAMP.test(at) ? at : EPOCH;
}
