/**
 * useHeroSubtext — aligns "More clarity." / "More control." / "More you."
 * under "All" / "one" / "place" (design: initHeroSubtext, README §4.3).
 * Replaces the previous hooks/useHeroSubtextPlacement.ts, which used the
 * same placement algorithm but read `#hero-sub` off `document` directly and
 * measured synchronously on mount only. This version, ported from the
 * dedicated hero handoff's own useHeroSubtext.ts:
 *   1. takes a ref instead of document.getElementById, so it's scoped to
 *      the element HeroSection actually renders rather than a page-wide id
 *      lookup, and
 *   2. re-measures one frame later via requestAnimationFrame (in addition
 *      to the synchronous on-mount measurement), so it never measures while
 *      the surrounding layout is still settling — a real behaviour
 *      difference from the old hook, not just a rename.
 */
import { type RefObject, useLayoutEffect } from "react";

export function useHeroSubtext(rowRef: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const lines = Array.from(row.querySelectorAll<HTMLElement>(".hero-sub-line"));
    if (!lines.length) return;

    const flow = () => {
      row.style.position = ""; row.style.height = "";
      lines.forEach((el) => { el.style.position = ""; el.style.left = ""; el.style.transform = ""; });
    };
    const apply = () => {
      flow(); // always measure from the natural wrapped layout
      const rowRect = row.getBoundingClientRect();
      if (!rowRect.width) return;
      const targets = lines.map((el) => document.getElementById(el.dataset.word || ""));
      if (targets.some((t) => !t)) return;
      const spans = lines.map((el, i) => {
        const wr = targets[i]!.getBoundingClientRect();
        return { el, w: el.getBoundingClientRect().width, c: wr.left + wr.width / 2 - rowRect.left, l: wr.left - rowRect.left, r: wr.right - rowRect.left };
      });
      const boxOf = (sp: (typeof spans)[number], i: number) =>
        i === 0 ? { a: sp.l, b: sp.l + sp.w } : i === spans.length - 1 ? { a: sp.r - sp.w, b: sp.r } : { a: sp.c - sp.w / 2, b: sp.c + sp.w / 2 };
      // any two phrases closer than 12px → leave the natural centred wrap
      for (let i = 1; i < spans.length; i++) if (boxOf(spans[i], i).a < boxOf(spans[i - 1], i - 1).b + 12) return;
      row.style.position = "relative";
      row.style.height = rowRect.height + "px";
      spans.forEach((sp, i) => {
        sp.el.style.position = "absolute";
        if (i === 0) { sp.el.style.left = sp.l + "px"; sp.el.style.transform = "none"; }
        else if (i === spans.length - 1) { sp.el.style.left = sp.r + "px"; sp.el.style.transform = "translateX(-100%)"; }
        else { sp.el.style.left = sp.c + "px"; sp.el.style.transform = "translateX(-50%)"; }
      });
    };
    apply();
    const id = requestAnimationFrame(apply);
    window.addEventListener("resize", apply);
    document.fonts?.ready.then(apply).catch(() => {});
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", apply); };
  }, [rowRef]);
}
