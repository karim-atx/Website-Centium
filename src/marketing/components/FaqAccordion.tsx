import React, { useState } from "react";
import { Plus } from "lucide-react";
import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

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
              className="w-full flex items-center justify-between gap-4 py-[15px] text-left"
            >
              <span className="text-[15px] font-semibold text-mkt-ink">{item.q}</span>
              <Plus size={16} className={clsx("shrink-0 text-mkt-faint transition-transform", isOpen && "rotate-45")} />
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
                  <p className="text-[14.5px] leading-relaxed text-mkt-soft pb-5 max-w-xl">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
