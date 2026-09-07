import { useEffect, useRef } from "react";

/** v4 landing handoff: the pricing heading's mirrored leaf-stem accents only
 *  have room to sit in their own side gutter above 620px — below that the
 *  gutter collapses to 0 and the accents hide, since a viewport-relative
 *  `vw` gutter wouldn't respond to the container itself narrowing (e.g.
 *  inside a narrower parent at a wide viewport) and would crush the heading.
 *  Driven by the heading block's own measured width via ResizeObserver
 *  (plus a resize listener as a fallback) rather than a media query. */
export function usePricingAccents<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const accents = Array.from(el.querySelectorAll<HTMLElement>(":scope > span[aria-hidden]"));
    const apply = () => {
      const room = el.offsetWidth >= 620;
      el.style.paddingLeft = room ? "96px" : "0px";
      el.style.paddingRight = room ? "96px" : "0px";
      accents.forEach((a) => {
        a.style.display = room ? "block" : "none";
      });
    };
    apply();
    window.addEventListener("resize", apply);
    let ro: ResizeObserver | undefined;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(apply);
      ro.observe(el);
    }
    return () => {
      window.removeEventListener("resize", apply);
      ro?.disconnect();
    };
  }, []);
  return ref;
}
