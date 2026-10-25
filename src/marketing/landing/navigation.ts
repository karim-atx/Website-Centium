// Centium landing v29: moving around the marketing site the way the
// prototype does (its `nav`, `navClick`, `scrollLink`, `goHomeNav`):
// - another page: remember where this one was (history.state.cy, restored on
//   back/forward), fade the page out (.32 s; at once under reduced motion),
//   then navigate. The new page starts at the top and fades in.
// - a section of the landing while on it: smooth-scroll to it minus 72px (the
//   navbar), no history entry. From another page: navigate to /#section.
// Pinned sections scroll to their track, as the prototype does: #platform to
// the pillars' track, #everyone to section 06's.

import { createContext, useCallback, useContext, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { reducedMotion } from "./engine/env";

/** The navbar's height: anchors land this far below the top. */
export const ANCHOR_OFFSET = 72;

const TRACK_FOR: Record<string, string> = { platform: "pl-track", everyone: "eco-track" };

/** The element a public anchor scrolls to (#platform scrolls to the pillars' pinned track). */
export function anchorTarget(id: string): HTMLElement | null {
  return document.getElementById(TRACK_FOR[id] ?? id) ?? document.getElementById(id);
}

/** How far below the top an anchor lands: the navbar, or the element's own
 *  scroll-margin-top when it sets a larger one (the Legal page's documents
 *  and groups: 96px, LG1), so a deep link lands where the browser's own jump
 *  would. */
export function anchorOffset(el: HTMLElement): number {
  return Math.max(ANCHOR_OFFSET, parseFloat(getComputedStyle(el).scrollMarginTop) || 0);
}

/** Scroll to a landing section minus the navbar. Returns false when the section is not on this page. */
export function scrollToSection(id: string, behavior?: ScrollBehavior): boolean {
  const el = anchorTarget(id);
  if (!el) return false;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - anchorOffset(el), behavior: behavior ?? (reducedMotion() ? "auto" : "smooth") });
  return true;
}

/** MarketingLayout provides the page fade. */
export const PageFadeContext = createContext<{ fadeOut: () => void }>({ fadeOut: () => {} });

/** The prototype's `nav(href)`: save this page's scroll position into the current
 *  history entry, fade out, then navigate. */
export function useMarketingNav() {
  const navigate = useNavigate();
  const { fadeOut } = useContext(PageFadeContext);
  return useCallback(
    (href: string) => {
      try {
        window.history.replaceState({ ...(window.history.state || {}), cy: Math.round(window.scrollY) }, "");
      } catch {
        /* history unavailable */
      }
      const rm = reducedMotion();
      fadeOut();
      window.setTimeout(() => navigate(href), rm ? 0 : 320);
    },
    [navigate, fadeOut],
  );
}

/** A click on a link to a landing section: scroll there when on the landing,
 *  else go to /#id. For onClick handlers of <a href="/#id">. */
export function useSectionLink() {
  const go = useMarketingNav();
  return useCallback(
    (id: string) => (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (window.location.pathname === "/") {
        scrollToSection(id);
        return;
      }
      go("/#" + id);
    },
    [go],
  );
}

/** A plain click on a link to another marketing page, through the fade. */
export function usePageLink() {
  const go = useMarketingNav();
  return useCallback(
    (href: string) => (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      go(href);
    },
    [go],
  );
}
