// Market + Share 3.0 · FilterPopup state, ported from Client Explore Screens'
// script: `toggleFilter` (open / close, keeping the selection), `closeFilter`
// (Done or the scrim: close, keep), `clearFilter` ("Show all": close and
// empty), `toggleOpt` (stay open, add or remove one option), `matches` (every
// group with a choice must match one of its choices) and `filterSummary`
// (the choices joined with " · "). The board's preset choices are its demo
// frames; the real state starts closed and empty.

import { t, tx } from "../../i18n/core";

export interface FilterState {
  open: boolean;
  selected: string[];
}

export const FILTER_INITIAL: FilterState = { open: false, selected: [] };

export const toggleFilter = (s: FilterState): FilterState => ({ open: !s.open, selected: s.selected });
export const closeFilter = (s: FilterState): FilterState => ({ open: false, selected: s.selected });
export const clearFilter = (): FilterState => ({ open: false, selected: [] });
export const toggleOption = (s: FilterState, value: string): FilterState => ({
  open: true,
  selected: s.selected.includes(value) ? s.selected.filter((x) => x !== value) : [...s.selected, value],
});

export const filterActive = (selected: readonly string[]): boolean => selected.length > 0;
/**
 * An option as shown: the options are English keys (tk() at the caller) or
 * names (user data, which t() leaves as they are). "Online" in the
 * Professionals filter is the session format, not presence, so it reads with
 * its context key; the value matched in code stays "Online".
 */
export const filterOptionLabel = (o: string): string => (o === "Online" ? tx("Online", "session format") : t(o));

export const filterSummary = (selected: readonly string[]): string => selected.map(filterOptionLabel).join(" · ");

export interface FilterGroupDef<T> {
  heading: string;
  options: readonly string[];
  /** Whether an item matches one option of this group. */
  test: (item: T, option: string) => boolean;
}

/** `matches(c)`: each group with a choice must match at least one of its chosen options. */
export function matchesFilter<T>(groups: readonly FilterGroupDef<T>[], selected: readonly string[], item: T): boolean {
  return groups.every((g) => {
    const on = g.options.filter((o) => selected.includes(o));
    return on.length === 0 || on.some((o) => g.test(item, o));
  });
}
