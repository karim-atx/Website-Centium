// Round C · DK: a searched term inside a PostgREST like / ilike filter.
//
// Postgres reads % and _ as wildcards and \ as the escape character, and
// PostgREST also turns * into % (so URLs needn't encode %). Each is escaped
// so a search for "50%" or "*" looks for those characters instead of
// matching everything.

export function escapeLike(term: string): string {
  return term.replace(/[\\%_*]/g, (c) => "\\" + c);
}
