import { useEffect } from "react";

/** v4 landing handoff: places each hero subtext phrase against its own
 *  headline word — "More clarity." flush to the left edge of "All", "More
 *  control." centred on "one", "More you." flush to the right edge of
 *  "place" — so the subtext row reads edge-to-edge with the headline above
 *  it. A flex row with `justify-content: space-between` only pins the outer
 *  two phrases and leaves the middle one off its word, so this measures each
 *  target word's rect and places the phrases with absolute `left` +
 *  `transform` instead. Falls back to the default centred-wrap layout
 *  (nothing overridden) when the phrases would collide at the current width
 *  — tested against each phrase's real placed box, not a centred one.
 *  Re-measures on resize and once webfonts finish loading, since metrics
 *  shift until then. Expects `#hero-sub` to contain `.hero-sub-line`
 *  elements each carrying `data-word="<id of its target word span>"`. */
export function useHeroSubtextPlacement() {
  useEffect(() => {
    const row = document.getElementById("hero-sub");
    if (!row) return;
    const lines = Array.from(row.querySelectorAll<HTMLElement>(".hero-sub-line"));
    if (!lines.length) return;

    const flow = () => {
      row.style.position = "";
      row.style.height = "";
      lines.forEach((el) => {
        el.style.position = "";
        el.style.left = "";
        el.style.transform = "";
      });
    };

    const apply = () => {
      flow();
      const rowRect = row.getBoundingClientRect();
      if (!rowRect.width) return;
      const targets = lines.map((el) => document.getElementById(el.getAttribute("data-word") || ""));
      if (targets.some((t) => !t)) return;

      const spans = lines.map((el, i) => {
        const wr = targets[i]!.getBoundingClientRect();
        return {
          el,
          w: el.getBoundingClientRect().width,
          c: wr.left + wr.width / 2 - rowRect.left,
          l: wr.left - rowRect.left,
          r: wr.right - rowRect.left,
        };
      });

      const boxOf = (sp: (typeof spans)[number], i: number) =>
        i === 0
          ? { a: sp.l, b: sp.l + sp.w }
          : i === spans.length - 1
            ? { a: sp.r - sp.w, b: sp.r }
            : { a: sp.c - sp.w / 2, b: sp.c + sp.w / 2 };

      for (let i = 1; i < spans.length; i++) {
        if (boxOf(spans[i], i).a < boxOf(spans[i - 1], i - 1).b + 12) return;
      }

      row.style.position = "relative";
      row.style.height = rowRect.height + "px";
      spans.forEach((sp, i) => {
        sp.el.style.position = "absolute";
        if (i === 0) {
          sp.el.style.left = sp.l + "px";
          sp.el.style.transform = "none";
        } else if (i === spans.length - 1) {
          sp.el.style.left = sp.r + "px";
          sp.el.style.transform = "translateX(-100%)";
        } else {
          sp.el.style.left = sp.c + "px";
          sp.el.style.transform = "translateX(-50%)";
        }
      });
    };

    apply();
    window.addEventListener("resize", apply);
    document.fonts?.ready?.then(apply).catch(() => {});
    return () => window.removeEventListener("resize", apply);
  }, []);
}
