import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";

/**
 * V6-128 / HE1 "Widget motion": a hero loop runs only while its element is on
 * screen and the app is in the foreground; Reduce motion keeps the static
 * final frame. Returns a ref for the element and whether the loop may run.
 *
 * Callers gate their CSS animation on `running` (animation-play-state, or
 * rendering the animated element only when true), so an off-screen widget or
 * a backgrounded tab costs nothing.
 */
export function useLoopWhileVisible<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const reduce = useReducedMotion();
  const [onScreen, setOnScreen] = useState(false);
  const [foreground, setForeground] = useState(() =>
    typeof document === "undefined" ? true : document.visibilityState !== "hidden"
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setOnScreen(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) setOnScreen(e.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onVis = () => setForeground(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return [ref, !reduce && onScreen && foreground];
}
