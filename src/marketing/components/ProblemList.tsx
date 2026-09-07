import React, { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

export interface ProblemItem {
  label: string;
  tag: string;
}

/** The Problem section's animated strikethrough list. Each row strikes as it
 *  crosses 82% of viewport height, fading its own ink from #221E1A to
 *  #A9A29A as it goes; once all five have struck, the "Centium is the
 *  solution" bar resolves in with a one-shot three-layer teal sheen (a
 *  vertical wipe, a diagonal gloss, and a pulsing ring on the bar itself)
 *  that clears itself at 2200ms so the bar always rests on its flat fill.
 *
 *  Each label carries an absolutely-positioned duplicate of itself, painted
 *  fully transparent (color + -webkit-text-fill-color) so only its
 *  text-decoration: line-through rule is visible — a clip-path reveals that
 *  duplicate row by row, so the strike follows the text exactly (including
 *  wraps) instead of being a separately-positioned line that could drift.
 *
 *  v4 landing handoff: every row now gets the identical plain treatment
 *  (solid 2px #8C8378, revealed left-to-right, no rotation) — the v3 handoff
 *  varied rotation/thickness/style per row and swapped row 2 for a crossing
 *  "X", but that read as busy, and the plain line was chosen deliberately as
 *  the more premium read. Any styled variant here is a regression. */
const STRIKE_DUR = ".5s";
const STRIKE_EASE = "cubic-bezier(.3,0,.2,1)";

export const ProblemList: React.FC<{ items: ProblemItem[] }> = ({ items }) => {
  const [struck, setStruck] = useState(0);
  const [sheenOn, setSheenOn] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      setStruck(items.length);
      return;
    }
    const onScroll = () => {
      const list = listRef.current;
      if (!list) return;
      const rows = list.children;
      const vh = window.innerHeight;
      let k = 0;
      for (let i = 0; i < items.length && i < rows.length; i++) {
        if (rows[i].getBoundingClientRect().top < vh * 0.82) k = i + 1;
      }
      setStruck((prev) => (k > prev ? k : prev));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items.length, reduceMotion]);

  const allStruck = struck >= items.length;

  useEffect(() => {
    if (!allStruck || reduceMotion) return;
    setSheenOn(true);
    const t = setTimeout(() => setSheenOn(false), 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allStruck]);

  return (
    <div ref={listRef} className="flex flex-col">
      {items.map((item, i) => {
        const on = struck > i;
        return (
          <div key={item.label} className="flex items-center justify-between py-[15px] border-t border-mkt-line">
            <span
              className="relative block whitespace-nowrap text-[17.5px] pr-3.5 transition-colors duration-[700ms] ease-out"
              style={{ color: on ? "#A9A29A" : "#221E1A" }}
            >
              {item.label}
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "100%",
                  boxSizing: "border-box",
                  whiteSpace: "nowrap",
                  paddingRight: 14,
                  color: "transparent",
                  WebkitTextFillColor: "transparent",
                  textDecorationLine: "line-through",
                  textDecorationColor: "#8C8378",
                  textDecorationStyle: "solid",
                  textDecorationThickness: 2,
                  clipPath: on ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
                  WebkitClipPath: on ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
                  transition: `clip-path ${STRIKE_DUR} ${STRIKE_EASE}`,
                  pointerEvents: "none",
                }}
              >
                {item.label}
              </span>
            </span>
            <span className="text-xs text-[#C3BCB2] whitespace-nowrap shrink-0">{item.tag}</span>
          </div>
        );
      })}
      <div
        className={
          "relative flex items-center justify-between py-[22px] px-6 mt-[22px] rounded-2xl overflow-hidden transition-[opacity,transform] duration-[600ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)]" +
          (sheenOn ? " animate-cent-teal-edge" : "")
        }
        style={{
          opacity: allStruck ? 1 : 0,
          transform: allStruck ? "none" : "translateY(14px) scale(.98)",
          background: "#E6DFF7",
          border: "3px solid #7D67D9",
          boxShadow: "0 14px 32px rgba(72,58,130,.14)",
        }}
      >
        <span className="font-bold text-[17px] tracking-tight" style={{ color: "#7D67D9" }}>
          Centium is the solution
        </span>
        <span className="font-semibold text-xs tracking-[.14em] whitespace-nowrap" style={{ color: "#7D67D9" }}>
          ONE PLACE
        </span>
        {sheenOn && (
          <>
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-full pointer-events-none rounded-[inherit] animate-cent-teal-wipe"
              style={{
                background:
                  "linear-gradient(rgba(94,158,149,0) 0%,rgba(94,158,149,.34) 38%,rgba(120,190,180,.72) 50%,rgba(94,158,149,.3) 62%,rgba(94,158,149,0) 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.5),inset 0 -1px 0 rgba(47,95,88,.18)",
              }}
            />
            <span
              aria-hidden="true"
              className="absolute left-0 w-[34%] pointer-events-none animate-cent-teal-gloss"
              style={{
                top: "-20%",
                bottom: "-20%",
                background:
                  "linear-gradient(100deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.42) 42%,rgba(214,240,235,.7) 52%,rgba(255,255,255,0) 100%)",
                filter: "blur(1px)",
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};
