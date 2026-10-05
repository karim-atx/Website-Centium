import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Whether to reduce motion: the in-app switch (Settings › Accessibility ›
 * Reduce motion) OR the device's own setting (R19, C24).
 *
 * ONE HOOK FOR BOTH. The CSS side is already covered both ways: the in-app
 * switch puts `reduce-motion` on <html>, which zeroes every CSS animation and
 * transition, and the components that animate in CSS also answer the OS media
 * query. What neither reaches is motion driven from JavaScript (confetti
 * pieces, the metronome's pulse, the unlock toast's sequence, the voice
 * logger's waveform, the yoga figure); those read this.
 *
 * Initialised from the query rather than set in an effect, so the first paint
 * is already right; the listener follows a change mid-session.
 */
export function useReducedMotion(): boolean {
  const { accessibility } = useApp();
  const [os, setOs] = useState(() => (typeof window !== "undefined" && window.matchMedia?.(QUERY).matches) || false);
  useEffect(() => {
    const query = window.matchMedia?.(QUERY);
    if (!query) return;
    const onChange = (e: MediaQueryListEvent) => setOs(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return accessibility.reduceMotion || os;
}
