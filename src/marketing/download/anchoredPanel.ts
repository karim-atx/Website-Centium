// The download button's two pop-up panels ("Other platforms" and the Windows
// "Why?"), drawn in the site root (a portal, position: fixed) and placed by
// their toggle: under it, or above it when there is more room there, and
// scrolling inside themselves if neither side holds them, centred on the
// toggle, kept 16px inside the screen and clear of the fixed navbar. They
// close on Escape (focus goes back to the toggle), a click outside, a second
// click, a scroll or a resize.
// Keyboard: Tab from the open toggle enters the panel, Shift+Tab from its
// first stop comes back, Tab from its last stop closes it and moves on. A
// panel with no links is itself the one stop (tabIndex -1).

import type React from "react";
import { useEffect, useLayoutEffect, useRef } from "react";

/** The site's 16px side gutter: a panel never comes closer to the screen's edge. */
export const GUTTER = 16;

export function useAnchoredPanel<P extends HTMLElement>(open: boolean, setOpen: (v: boolean) => void) {
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<P>(null);

  useLayoutEffect(() => {
    const tg = toggle.current, el = panel.current;
    if (!open || !tg || !el) return;
    el.style.maxHeight = "";
    el.style.overflowY = "";
    const k = tg.getBoundingClientRect();
    const w = el.offsetWidth, h = el.offsetHeight;
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    // Never under the fixed navbar (#site-nav, z-index 60) while it shows.
    const top = Math.max(GUTTER, (document.getElementById("site-nav")?.getBoundingClientRect().bottom ?? 0) + 8);
    const below = vh - GUTTER - k.bottom, above = k.top - top;
    const up = h > below && above > below;
    const room = up ? above : below;
    if (h > room) {
      el.style.maxHeight = `${room}px`;
      el.style.overflowY = "auto";
    }
    el.style.top = `${up ? k.top - Math.min(h, room) : k.bottom}px`;
    el.style.left = `${Math.max(GUTTER, Math.min(vw - GUTTER - w, k.left + k.width / 2 - w / 2))}px`;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const inside = (n: Node | null) => !!n && (!!toggle.current?.contains(n) || !!panel.current?.contains(n));
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (inside(document.activeElement)) toggle.current?.focus({ preventScroll: true });
      setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (!inside(e.target as Node)) setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, setOpen]);

  // The panel sits elsewhere in the page, so Tab is carried across by hand.
  const stops = (): HTMLElement[] => {
    const el = panel.current;
    if (!el) return [];
    const links = Array.from(el.querySelectorAll<HTMLElement>("a[href],button"));
    return links.length ? links : [el];
  };
  const onToggleKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (open && e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      stops()[0]?.focus({ preventScroll: true });
    }
  };
  const onPanelKey = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Tab") return;
    const s = stops();
    const i = s.indexOf(e.target as HTMLElement);
    if (e.shiftKey && i === 0) {
      e.preventDefault();
      toggle.current?.focus({ preventScroll: true });
    } else if (!e.shiftKey && i === s.length - 1) {
      // Close, put focus back on the toggle, and let this Tab move on from it.
      setOpen(false);
      toggle.current?.focus({ preventScroll: true });
    }
  };

  return { toggle, panel, onToggleKey, onPanelKey };
}
