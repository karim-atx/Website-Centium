import React, { useState } from "react";
import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AppScreen } from "./illustrations/AppScreen";

export interface ShowcaseTab {
  label: string;
  title: string;
  description: string;
  points: string[];
  tone: "primary" | "teal";
  screen: Parameters<typeof AppScreen>[0]["variant"];
}

/** Segmented pill tabs above a single panel that swaps content on click ---
 *  the "five pillar cards become one tabbed showcase" pattern from the
 *  hi-fi Home page, reused on Product. Active pill background is dark
 *  (#221E1A) per the hi-fi spec, distinct from the nav's white sliding pill. */
export const TabShowcase: React.FC<{ tabs: ShowcaseTab[] }> = ({ tabs }) => {
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();
  const tab = tabs[active];

  return (
    <div>
      <div className="flex gap-2 flex-wrap" role="tablist">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={clsx(
              "px-5 py-[11px] rounded-full border font-semibold text-sm transition-colors",
              i === active
                ? "bg-mkt-ink text-white border-mkt-ink"
                : "bg-white text-mkt-soft border-mkt-line hover:border-mkt-ink/30"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-7 border border-mkt-line rounded-[26px] bg-white p-6 sm:p-11 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab.label}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="grid lg:grid-cols-2 gap-8 sm:gap-14 items-center"
          >
            <div>
              <h3 className="font-display font-extrabold text-[26px] sm:text-[30px] leading-[1.15] tracking-tight text-mkt-ink">
                {tab.title}
              </h3>
              <p className="text-[16px] leading-relaxed text-mkt-soft mt-4 max-w-[420px]">{tab.description}</p>
              <ul className="flex flex-col gap-3 mt-[26px]">
                {tab.points.map((p) => (
                  <li key={p} className="flex gap-[11px] items-baseline">
                    <span className={clsx("font-bold text-[13px]", tab.tone === "primary" ? "text-mkt-accent" : "text-mkt-teal")}>
                      —
                    </span>
                    <span className="text-[15px] text-mkt-ink/85">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="h-[280px] sm:h-[400px] rounded-[20px] overflow-hidden bg-mkt-wash2 border border-mkt-line">
              <AppScreen variant={tab.screen} className="rounded-[20px]" />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
