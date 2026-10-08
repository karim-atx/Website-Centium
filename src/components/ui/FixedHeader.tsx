import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useReducedMotion } from "../../hooks/useReducedMotion";

/**
 * The shared fixed header on scroll (v6 Part B "Fixed header on scroll";
 * WO1.s #1, FO1 #1, MO1.7 #1, MO1.4.2.1.s; PB4 §8 1a; V6-91).
 *
 * A page's title block (title, tabs, search, sub-tabs) stays fixed at the top
 * while the content scrolls under it. At rest it is transparent over the page
 * background; once content passes under it, it fades in the page fill
 * (#FFFFFF, dark #121317: --c-cream, so there is no seam) and a 1px hairline
 * at its bottom (#241F1B@8% light, #F5F3FA@10% dark; 30% of ink under High
 * contrast through the --hair-* tokens), no shadow, no blur. The fade is
 * 120 ms on opacity; none under Reduce motion (the in-app switch or the
 * device setting).
 *
 * MECHANICS
 * - `position: sticky` inside <main>, full bleed (-mx-4 px-4 by default, the
 *   client column's 16 gutter), z-20: under sheets (z-50) and popups, over
 *   content (WO1.s K1 "popups and sheets open above the fixed area").
 * - It sticks at `top = safe-area + 24` (the shell's top padding, where its
 *   content already sits at rest), so the title never moves; the fill also
 *   covers the strip above it (the notch and the 24 gap) through an
 *   extension of the fill layer, so content never shows above the header.
 * - "Content under it" comes from a 1 px sentinel right before the header,
 *   watched by an IntersectionObserver whose root is shrunk by the sticky
 *   top: once the sentinel leaves that root upwards, the header is stuck
 *   with content under it.
 * - Banners above the page (Offline, Pending deletion, Consent review) stay
 *   in flow above it and scroll away (WO1.s K1); the header sticks once they
 *   have passed.
 * - Larger text: the header's height is measured (ResizeObserver), not
 *   assumed, and written to the document's `scroll-padding-top` (sticky top +
 *   height), so focused or scrolled-to items are never hidden under it. The
 *   same value is published as `--fixed-header-bottom` on <html> for pages
 *   that offset their own anchors. Both are removed on unmount.
 *
 * `data-under` on the header is "true" while content is under it, for
 * callers that restyle a child in the scrolled state.
 */
export const FixedHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
  /** Bleed classes; default "-mx-4 px-4" (the client shell's gutter). */
  bleedClassName?: string;
  /** Bottom padding inside the header (WO1.s 16, MO1.7 12). Default 16. */
  paddingBottom?: number;
  /** Called when the scrolled state changes. */
  onUnderChange?: (under: boolean) => void;
  /** Accessible landmark-free container: pass an id if a page needs one. */
  id?: string;
}> = ({ children, className, bleedClassName = "-mx-4 px-4", paddingBottom = 16, onUnderChange, id }) => {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [under, setUnder] = useState(false);
  const reduced = useReducedMotion();
  const onChange = useRef(onUnderChange);
  useEffect(() => {
    onChange.current = onUnderChange;
  });

  // The sentinel: content is under the header once the sentinel has scrolled
  // above the sticky line.
  useEffect(() => {
    const header = headerRef.current;
    const sentinel = sentinelRef.current;
    if (!header || !sentinel) return;
    let io: IntersectionObserver | null = null;
    const observe = () => {
      io?.disconnect();
      const top = parseFloat(getComputedStyle(header).top) || 0;
      io = new IntersectionObserver(
        ([entry]) => {
          const next = !entry.isIntersecting && entry.boundingClientRect.top < top;
          setUnder(next);
        },
        { rootMargin: `${-Math.round(top)}px 0px 0px 0px`, threshold: [0, 1] }
      );
      io.observe(sentinel);
    };
    observe();
    // The safe-area inset (and so the sticky top) can change on rotation.
    window.addEventListener("resize", observe);
    return () => {
      window.removeEventListener("resize", observe);
      io?.disconnect();
    };
  }, []);

  useEffect(() => {
    onChange.current?.(under);
  }, [under]);

  // scroll-padding-top = sticky top + measured height (Larger text grows it).
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const root = document.documentElement;
    const write = () => {
      const top = parseFloat(getComputedStyle(header).top) || 0;
      const bottom = Math.ceil(top + header.offsetHeight);
      root.style.scrollPaddingTop = `${bottom}px`;
      root.style.setProperty("--fixed-header-bottom", `${bottom}px`);
    };
    write();
    const ro = new ResizeObserver(write);
    ro.observe(header);
    window.addEventListener("resize", write);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", write);
      root.style.scrollPaddingTop = "";
      root.style.removeProperty("--fixed-header-bottom");
    };
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden style={{ height: 1, marginBottom: -1 }} />
      <div
        ref={headerRef}
        id={id}
        data-fixed-header=""
        data-under={under ? "true" : "false"}
        className={clsx("sticky z-20", bleedClassName, className)}
        style={{ top: "calc(env(safe-area-inset-top) + 24px)", paddingBottom }}
      >
        {/* The fill and hairline: one layer that also reaches up over the
            notch and the shell's 24 top gap, faded as one (120 ms). */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 pointer-events-none bg-cream border-b border-hair-08 dark:border-hair-10"
          style={{
            top: "calc(-1 * (env(safe-area-inset-top) + 24px))",
            opacity: under ? 1 : 0,
            transition: reduced ? "none" : "opacity 120ms ease",
          }}
        />
        <div className="relative">{children}</div>
      </div>
    </>
  );
};
