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

/**
 * True inside a spanning pane (the professional More and the Client /
 * Professional Settings panes, Professional handover v1 section 4): a page's
 * own header drops its back chevron there and takes the pane header (ST
 * Settings Web: the title 28/36 700, the line 13/20 #8C8378, 28 above the
 * first block). False everywhere else, mobile included.
 */
export const PaneSpanContext = createContext(false);
export const usePaneSpan = (): boolean => useContext(PaneSpanContext);
