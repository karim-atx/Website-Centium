import { useEffect, useState } from "react";

/**
 * A "show password" toggle that never outlives the moment it was turned on
 * for. Hidden by default, so a remount (leaving the step, the route changing)
 * always starts hidden; and hidden again when the page is left, because the
 * browser's back/forward cache would otherwise restore the page, and the
 * password, exactly as it was shown. Screens that swap forms inside one
 * component also call `hide()` on every switch.
 */
export function usePasswordVisibility() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const hide = () => setShown(false);
    window.addEventListener("pagehide", hide);
    return () => window.removeEventListener("pagehide", hide);
  }, []);
  return { shown, toggle: () => setShown((v) => !v), hide: () => setShown(false) };
}
