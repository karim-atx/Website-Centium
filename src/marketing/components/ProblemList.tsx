import React, { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

export interface ProblemItem {
  label: string;
  tag: string;
}

/** The Problem section's animated strikethrough list, per the v2 landing
 *  handoff. Each row strikes as it crosses 82% of viewport height; once all
 *  five have struck, the "Centium is the solution" row resolves in with a
 *  one-shot shimmer.
 *
 *  Each label carries an absolutely-positioned duplicate of itself, painted
 *  fully transparent (color + -webkit-text-fill-color) so only its
 *  text-decoration: line-through rule is visible — a clip-path reveals that
 *  duplicate row by row, so the strike follows the text exactly (including
 *  wraps) instead of being a separately-positioned line that could drift.
 *  No two rows strike the same way: distinct duration, easing, thickness,
 *  style, direction and rotation per the handoff's own spec. */
const STRIKE_SPEC = [
  { dur: ".38s", ease: "cubic-bezier(.3,0,.2,1)", th: 2, style: "solid", from: "right", rot: "-1.2deg" },
  { dur: ".85s", ease: "cubic-bezier(.62,0,.38,1)", th: 1.5, style: "wavy", from: "left", rot: "0.9deg" },
  { dur: ".55s", ease: "cubic-bezier(.34,1.5,.5,1)", th: 3, style: "solid", from: "center", rot: "-2.2deg" },
  { dur: "1.05s", ease: "linear", th: 1.5, style: "double", from: "right", rot: "1.6deg" },
  { dur: ".72s", ease: "steps(11,end)", th: 2, style: "dashed", from: "left", rot: "-0.5deg" },
] as const;

export const ProblemList: React.FC<{ items: ProblemItem[] }> = ({ items }) => {
  const [struck, setStruck] = useState(0);
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

  return (
    <div ref={listRef} className="flex flex-col">
      {items.map((item, i) => {
        const sp = STRIKE_SPEC[i];
        const on = struck > i;
        const hidden =
          sp.from === "right" ? "inset(0 100% 0 0)" : sp.from === "left" ? "inset(0 0 0 100%)" : "inset(0 50% 0 50%)";
        return (
          <div key={item.label} className="flex items-center justify-between py-[15px] border-t border-mkt-line">
            <span className="relative block whitespace-nowrap text-[17.5px] text-[#A9A29A] pr-3.5">
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
                  textDecorationColor: i % 2 === 0 ? "#8C8378" : "#A9A29A",
                  textDecorationStyle: sp.style,
                  textDecorationThickness: sp.th,
                  clipPath: on ? "inset(0 0 0 0)" : hidden,
                  WebkitClipPath: on ? "inset(0 0 0 0)" : hidden,
                  transform: `rotate(${sp.rot})`,
                  transformOrigin: sp.from === "right" ? "left center" : sp.from === "left" ? "right center" : "center",
                  transition: `clip-path ${sp.dur} ${sp.ease}`,
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
        className="relative flex items-center justify-between py-[22px] px-6 mt-[22px] rounded-2xl bg-mkt-tint-deep overflow-hidden transition-[opacity,transform] duration-[600ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)]"
        style={{ opacity: allStruck ? 1 : 0, transform: allStruck ? "none" : "translateY(14px) scale(.98)" }}
      >
        <span className="font-bold text-[17px] tracking-tight text-mkt-ink">Centium is the solution</span>
        <span className="font-semibold text-xs tracking-[.14em] text-[#5C48A8] whitespace-nowrap">ONE PLACE</span>
        {allStruck && (
          <span
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(100deg, transparent 42%, rgba(255,255,255,.85) 50%, transparent 58%)",
              backgroundSize: "280% 100%",
              backgroundPosition: "-90% 0",
              animation: "mkt-shimmer 1.2s ease-in-out .25s",
            }}
          />
        )}
      </div>
    </div>
  );
};
