// Centium landing: the footer's "Professionals" and "Businesses" links
// (round 7, handoff-landing-fix SPEC F5). /#professionals and /#business
// open section 06 with that audience selected on its first card: from a
// click on the landing (smooth, a history entry, back returns to where the
// visitor was), and from a shared link, a reload, another marketing page or
// back / forward (once the loader has finished and 06 exists: instant, and
// aimed again 700 ms later, after late layout). No element has these ids, so
// the browser's own hash jump does nothing.

import { useCallback, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { LG, reducedMotion } from "./engine/env";
import { ANCHOR_OFFSET, useMarketingNav } from "./navigation";

/** history.state.usr of the entry a click on the landing pushed (Home lands
 *  it smoothly; every other arrival is instant). */
export const AUDIENCE_CLICK = { audienceClick: true } as const;

export const AUDIENCES = { professionals: 0, business: 1 } as const;
export type Audience = keyof typeof AUDIENCES;

/** The audience a hash names (#professionals, #business), or null. */
export function audienceOf(hash: string): Audience | null {
  const h = hash.replace(/^#/, "");
  return h === "professionals" || h === "business" ? h : null;
}

// Section 06's toggle listens here (Ecosystem.tsx); a request made before it
// mounts waits in `wanted`.
type Listener = (i: number) => void;
const listeners = new Set<Listener>();
let wanted: number | null = null;

export const audienceToggle = {
  /** Select toggle option i (0 Professionals, 1 Businesses). */
  select(i: number) {
    wanted = listeners.size ? null : i;
    listeners.forEach((l) => l(i));
  },
  /** A request made before the toggle mounted (its first state). */
  peek(): number | null {
    return wanted;
  },
  /** The toggle has mounted and listens from now on. */
  clear() {
    wanted = null;
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

/** A plain click on a footer audience link (modifier clicks open the real
 *  URL). On the landing: the current entry keeps the scroll position (cy,
 *  restored on back by MarketingLayout) and /#<audience> is pushed; from
 *  another page: the usual page change to /#<audience>. Home lands it. */
export function useAudienceLink() {
  const navigate = useNavigate();
  const go = useMarketingNav();
  return useCallback(
    (aud: Audience) => (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (window.location.pathname !== "/") {
        go("/#" + aud);
        return;
      }
      try {
        window.history.replaceState({ ...(window.history.state || {}), cy: Math.round(window.scrollY) }, "");
      } catch {
        /* history unavailable */
      }
      navigate("/#" + aud, { state: AUDIENCE_CLICK });
    },
    [navigate, go],
  );
}

/** Where 06's first card is: desktop, 1px into its pinned track (the first
 *  box); phones, the section top below the navbar. */
function audienceTop(): number | null {
  const track = document.getElementById("eco-track"),
    sec = document.getElementById("everyone");
  if (window.innerWidth >= LG && track) return track.getBoundingClientRect().top + window.scrollY + 1;
  return sec ? sec.getBoundingClientRect().top + window.scrollY - ANCHOR_OFFSET : null;
}

/** Select the audience, then (one layout later) scroll to its first card and
 *  move focus to the selected tab. */
export function landOnAudience(aud: Audience, instant: boolean): number {
  const i = AUDIENCES[aud];
  audienceToggle.select(i);
  return window.setTimeout(() => {
    const y = audienceTop();
    if (y == null) return;
    window.scrollTo({ top: y, behavior: instant || reducedMotion() ? "auto" : "smooth" });
    document.querySelectorAll<HTMLElement>("#eco-track [data-eset]").forEach((st) => st.scrollTo({ left: 0, behavior: "auto" }));
    const tab = document.querySelectorAll<HTMLElement>('#everyone [role="tab"]')[i];
    try {
      tab?.focus({ preventScroll: true });
    } catch {
      /* focus is a courtesy */
    }
  }, 80);
}
