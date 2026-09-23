import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const NAV_MIDLINE = 34; // half the 72px nav height — the line its content optically sits on

/** The nav bar is transparent, so its logo/text color must read whatever
 *  section is currently behind it. Any section marked `data-nav-dark` that
 *  spans the bar's mid-line flips the nav to light-on-dark; otherwise it's
 *  dark-on-light. Recomputed on every scroll/resize rather than reacting to
 *  an IntersectionObserver, matching the source handoff's `checkNavTheme()`.
 *
 *  The source handoff mounts everything (including Nav) fresh per its own
 *  in-page hash router. Here Nav sits outside <Outlet> and survives real
 *  route changes, so `pathname` is an explicit dependency to force a
 *  recheck when navigating to a page whose top section has a different
 *  data-nav-dark than the previous one. */
export function useNavTheme() {
  const [dark, setDark] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const check = () => {
      let next = false;
      const els = document.querySelectorAll("[data-nav-dark]");
      for (let i = 0; i < els.length; i++) {
        const r = els[i].getBoundingClientRect();
        if (r.top <= NAV_MIDLINE && r.bottom >= NAV_MIDLINE) {
          next = true;
          break;
        }
      }
      setDark((prev) => (prev === next ? prev : next));
    };
    // Same reasoning as useNavScrollSpy: a querySelectorAll plus a
    // getBoundingClientRect loop on every 'scroll' event, unthrottled, for
    // the whole page session -- rAF-coalesced to at most once per frame.
    let raf = 0;
    const scheduled = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; check(); }); };
    check();
    window.addEventListener("scroll", scheduled, { passive: true });
    window.addEventListener("resize", scheduled);
    return () => {
      window.removeEventListener("scroll", scheduled);
      window.removeEventListener("resize", scheduled);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  return dark;
}
