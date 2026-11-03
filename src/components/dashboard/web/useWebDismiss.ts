import { useEffect, useRef, type RefObject } from "react";

/**
 * Website viewport v1 (section 3, keyboard): while a web popover or popup is
 * open, focus moves into its panel (unless something inside already took
 * it), Escape closes it (unless something on top handled Escape first), and
 * focus goes back to where it was when it closes. Does nothing while `active`
 * is false, so a mobile caller passes false and is unchanged.
 */
export function useWebDismiss(active: boolean, onClose: () => void, panelRef: RefObject<HTMLElement | null>): void {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!active) return;
    const prev = document.activeElement as HTMLElement | null;
    let panel: HTMLElement | null = null;
    const t = window.setTimeout(() => {
      panel = panelRef.current;
      if (panel && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });
    }, 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      const now = document.activeElement;
      const lost = !now || now === document.body || !now.isConnected || !!panel?.contains(now);
      if (lost && prev && prev !== document.body && prev.isConnected) prev.focus({ preventScroll: true });
    };
  }, [active, panelRef]);
}
