import React, { useState } from "react";
import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export interface FaqItem {
  q: string;
  a: string;
  /** The question's leading interrogative ("Why", "What", "Who"...) — must be
   *  the literal start of `q` so it can be sliced off and wrapped in its own
   *  colored span. */
  lead: string;
  /** Color for both the lead word and the toggle pill — read from data
   *  rather than derived from index/open-state, so reordering the questions
   *  can't desync the two (v4 landing handoff). */
  color: string;
}

/** v4 landing handoff: the toggle pill's ink/background now come from the
 *  question's own lead-word color and stay constant across open/closed
 *  (previously: closed = lavender/#6A54C4, open = teal/#3F726D, the same
 *  pair for every row regardless of the question). The "+" still collapses
 *  its vertical bar via scaleY while the whole glyph rotates 180° to read
 *  as a plus-to-minus morph. */
export const FaqAccordion: React.FC<{ items: FaqItem[] }> = ({ items }) => {
  // Regression fix: all items load collapsed (the handoff's own initFaq()
  // starts with `let open = null`) — this previously defaulted to 0, opening
  // the first question on load.
  const [open, setOpen] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col">
      {items.map((item, i) => {
        const isOpen = open === i;
        const rest = item.q.slice(item.lead.length);
        return (
          <div key={item.q} className={clsx("border-t border-mkt-line", i === items.length - 1 && "border-b")}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-4 py-[17px] text-left"
            >
              <span className="text-[16px] font-semibold text-mkt-ink">
                <span style={{ color: item.color }}>{item.lead}</span>
                {rest}
              </span>
              <span
                className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center transition-colors duration-[280ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)]"
                style={{ background: `${item.color}29`, color: item.color }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  aria-hidden="true"
                  className="shrink-0 transition-transform duration-[340ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)]"
                  style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
                >
                  <path d="M5 12h14" />
                  <path
                    d="M12 5v14"
                    style={{
                      transformBox: "fill-box",
                      transformOrigin: "center",
                      transition: "transform .3s cubic-bezier(.22,1,.36,1),opacity .3s",
                      transform: isOpen ? "scaleY(0)" : "scaleY(1)",
                      opacity: isOpen ? 0 : 1,
                    }}
                  />
                </svg>
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="text-[14.5px] leading-[1.65] text-mkt-soft pb-[22px] max-w-[520px]">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
