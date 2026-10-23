import { useCallback, useState } from "react";
import { FILTER_INITIAL, clearFilter, closeFilter, filterActive, filterSummary, toggleFilter, toggleOption, type FilterState } from "./filterModel";

/** The filter state machine, as the board's script. Starts closed and empty. */
export function useFilter(initial: FilterState = FILTER_INITIAL) {
  const [state, setState] = useState<FilterState>(initial);
  return {
    open: state.open,
    selected: state.selected,
    active: filterActive(state.selected),
    summary: filterSummary(state.selected),
    toggleFilter: useCallback(() => setState(toggleFilter), []),
    closeFilter: useCallback(() => setState(closeFilter), []),
    clearFilter: useCallback(() => setState(clearFilter()), []),
    toggleOption: useCallback((v: string) => setState((s) => toggleOption(s, v)), []),
  };
}
