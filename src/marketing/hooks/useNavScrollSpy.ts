import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/** v3 landing handoff: nav active state for same-page hash links — immediate
 *  on click, scroll-spy otherwise (a 130px line from the viewport top).
 *  Ids that don't exist on the current route are filtered out, so this is a
 *  no-op (always returns null) on any page other than Home. A click wins for
 *  900ms so smooth-scrolling past intermediate sections on the way to the
 *  target doesn't flicker the highlight. */
export function useNavScrollSpy(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  const clickedRef = useRef<{ id: string; at: number } | null>(null);
  const { pathname } = useLocation();
  const idsKey = ids.join(",");

  useEffect(() => {
    const present = ids.filter((id) => document.getElementById(id));
    if (!present.length) {
      setActive(null);
      return;
    }
    const LINE = 130;
    const spy = () => {
      if (clickedRef.current && Date.now() - clickedRef.current.at < 900) return;
      clickedRef.current = null;
      // No `break`: the handoff's own spy() lets a later match overwrite an
      // earlier one in the same pass rather than stopping at the first hit —
      // only matters in the single-frame case where two sections' edges
      // straddle the line at once, but matches its behavior exactly.
      let found: string | null = null;
      for (const id of present) {
        const r = document.getElementById(id)!.getBoundingClientRect();
        if (r.top <= LINE && r.bottom > LINE) found = id;
      }
      setActive((prev) => (prev === found ? prev : found));
    };
    // Reported as a continuous mobile scroll stutter across the whole page,
    // not localized to one section -- consistent with this: `spy` ran a
    // getBoundingClientRect() per tracked id (here 3) on every single
    // 'scroll' event, unthrottled, for as long as Nav is mounted, which on
    // this single-page site is the entire session. rAF-coalescing multiple
    // scroll events into at most one measurement per frame is the same
    // pattern already used for usePillarRail's/useEcoSlider's resize
    // handlers; nothing here needs to run more often than the screen can
    // actually repaint.
    let raf = 0;
    const scheduled = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; spy(); }); };
    spy();
    window.addEventListener("scroll", scheduled, { passive: true });
    window.addEventListener("resize", scheduled);
    return () => {
      window.removeEventListener("scroll", scheduled);
      window.removeEventListener("resize", scheduled);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, pathname]);

  const onLinkClick = (id: string) => {
    clickedRef.current = { id, at: Date.now() };
    setActive(id);
  };

  return { active, onLinkClick };
}
