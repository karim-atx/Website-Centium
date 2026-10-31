// Round F (AV): sideways scrolling that works in both directions. In a
// right-to-left box, browsers count scrollLeft from 0 at the right edge down to
// negative numbers, so a carousel's page maths reads the distance from the
// inline start instead, and scrolls with the sign the box needs. In English
// these equal scrollLeft and scrollTo({ left }) exactly.

const rtl = (el: Element) => getComputedStyle(el).direction === "rtl";

/** How far el has scrolled from its inline start (never negative). */
export const inlineScrolled = (el: HTMLElement) => Math.abs(el.scrollLeft);

/** Scrolls el to x from its inline start. */
export function scrollToInline(el: HTMLElement, x: number, behavior?: ScrollBehavior) {
  el.scrollTo({ left: rtl(el) ? -x : x, behavior });
}
