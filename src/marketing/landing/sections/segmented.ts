// Landing update (C9, D9): the segmented toggles (section 06 Professionals /
// Businesses, Pricing's audience and billing): their sliding indicator, and
// arrow keys in the ones that are
// tablists (section 06 Professionals / Businesses, Pricing's audience). The
// standard tablist behaviour, by reading direction: left to right, ArrowRight
// is the next option and ArrowLeft the previous; right to left (Arabic, where
// the first option is on the right) the reverse. Home and End go to the first
// and last. Focus follows the selection.

import { useLayoutEffect, useState } from "react";
import type React from "react";
import { dirSign } from "../engine/env";

export function tablistKeys(n: number, cur: number, select: (i: number) => void) {
  return (e: React.KeyboardEvent<HTMLElement>) => {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = cur + dirSign();
    else if (e.key === "ArrowLeft") next = cur - dirSign();
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next == null) return;
    e.preventDefault();
    next = Math.max(0, Math.min(n - 1, next));
    if (next !== cur) select(next);
    const tabs = e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]');
    tabs[next]?.focus();
  };
}

/**
 * C9 (centium/ARABIC-RTL.md 6): the sliding indicator of a segmented toggle,
 * computed from the selected button's own position and width, so it lies
 * exactly under it whatever the direction and however wide each label is
 * (Arabic labels are not equal). Until it is measured (the first frame), it is
 * placed from the reading start by equal steps. `group` holds the buttons.
 */
export function useIndicator(group: React.RefObject<HTMLElement | null>, index: number, count: number): React.CSSProperties {
  const [m, setM] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const g = group.current;
    if (!g) return;
    const place = () => {
      const b = g.querySelectorAll<HTMLElement>("button")[index];
      // From the rendered boxes, so fractional widths (1fr of an odd width) stay exact.
      if (b) setM({ x: b.getBoundingClientRect().left - g.getBoundingClientRect().left - g.clientLeft, w: b.getBoundingClientRect().width });
    };
    place();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    ro?.observe(g);
    return () => ro?.disconnect();
  }, [group, index]);
  return m
    ? { left: "0px", width: m.w + "px", transform: `translateX(${m.x}px)` }
    : { insetInlineStart: "4px", width: `calc((100% - 8px) / ${count})`, transform: `translateX(${index * 100 * dirSign()}%)` };
}
