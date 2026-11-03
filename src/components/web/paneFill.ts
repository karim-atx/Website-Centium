import { createContext, useContext, useLayoutEffect } from "react";

// Website viewport v1: a page shown in the More / Settings pane sits in the
// pane's centred 430 column (its mobile screen) unless it asks to fill the
// pane (a designed pane page, e.g. the business kit's PaneFrame).

/** The pane's setter, from WebSecondaryLayout's Pane (null outside a pane). */
export const PaneFillContext = createContext<((fill: boolean) => void) | null>(null);

/** Called by a designed page while mounted: the pane drops its 430 column (and its padding) for it. */
export function usePaneFill(on = true): void {
  const set = useContext(PaneFillContext);
  useLayoutEffect(() => {
    if (!set || !on) return;
    set(true);
    return () => set(false);
  }, [set, on]);
}
