// Centium landing v29: environment flags (the prototype's `q` object, reduced
// to what production needs).
//
// - Reduced motion (the prototype's `rm`): the device setting
//   prefers-reduced-motion OR the app's own Settings > Accessibility > Reduce
//   motion, which AppContext puts on <html> as `reduce-motion` for every
//   route, the marketing pages included. Every sequence then jumps to its
//   final readable state and loops stop.
// - Low quality (the prototype's `q=low`): device pixel ratio 1 on canvases,
//   fewer glow passes, 25 fps line flow. Only from the URL (?q=low), as in the
//   prototype; nothing switches it on automatically.
// The prototype's QA-only flags (still, ip, only, fitw, ...) are not ported.

export function reducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.classList.contains("reduce-motion")) return true;
  return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

export function lowQuality(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("q") === "low";
  } catch {
    return false;
  }
}

/** Desktop breakpoint of the handover (lg = width >= 1024). */
export const LG = 1024;
/** Tablet breakpoint of the handover (sm = width >= 640). */
export const SM = 640;
