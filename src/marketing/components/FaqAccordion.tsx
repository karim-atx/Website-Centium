import React, { useState } from "react";
import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/** "+" in a lavender pill when closed, "−" in a teal pill when open — per
 *  the v2 landing handoff (supersedes the plain rotate-45 Plus glyph). The
 *  vertical bar of the plus collapses via scaleY while the whole glyph
 *  rotates 180°, so it reads as a genuine plus-to-minus morph rather than
 *  a generic rotation. */
export const FaqAccordion: React.FC<{ items: { q: string; a: string }[] }> = ({ items }) => {
  const [open, setOpen] = useState<number | null>(0);
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className={clsx("border-t border-mkt-line", i === items.length - 1 && "border-b")}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-4 py-[17px] text-left"
            >
              <span className="text-[16px] font-semibold text-mkt-ink">{item.q}</span>
              <span
                className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center transition-colors duration-[280ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)]"
                style={isOpen ? { background: "rgba(95,158,149,.2)", color: "#3F726D" } : { background: "rgba(125,103,217,.16)", color: "#6A54C4" }}
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
