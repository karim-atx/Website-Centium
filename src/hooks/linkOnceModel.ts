// Round J · J-2b: the widget and shortcut links' one-time parameters
// (website PLAN.md §2.4): log=1, start=today, start=1, pass=1. Pure, so it is
// tested on its own.

/** The query without `name`, everything else kept in order. */
export function withoutParam(search: URLSearchParams | string, name: string): URLSearchParams {
  const next = new URLSearchParams(search);
  next.delete(name);
  return next;
}
