import React, { useState } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import type { HabitItem } from "../../types";

const PER_PAGE = 6;

/**
 * The Habits card's body (Mind "Practice" and the Home habits widget): habits
 * six to a page, two columns, in a strip that SWIPES between pages. The
 * "For more habits, swipe." hint and the dots (one per page, the current one
 * solid) appear only when there is more than one page.
 *
 * The strip sits above the card's own 44px hit box (the card is a tappable
 * .tap button with no controls inside, so its ::after covers it), otherwise a
 * swipe would land on the button and never scroll. Tapping still opens the
 * habits as before: a swipe on a touch screen is not a click.
 */
export const HabitPages: React.FC<{ habits: HabitItem[] }> = ({ habits }) => {
  const pages: HabitItem[][] = [];
  for (let i = 0; i < habits.length; i += PER_PAGE) pages.push(habits.slice(i, i + PER_PAGE));
  const [page, setPage] = useState(0);

  return (
    <div className="flex-1 flex flex-col justify-between min-h-0 mt-[9px]">
      <div
        onScroll={(e) => {
          const el = e.currentTarget;
          setPage(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        className="relative z-[1] flex scroll-row no-scrollbar"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {pages.map((items, i) => (
          <div
            key={i}
            aria-label={pages.length > 1 ? `Habits page ${i + 1} of ${pages.length}` : undefined}
            className="grid grid-cols-2 gap-x-2.5 gap-y-[5px] content-start shrink-0 w-full"
            style={{ scrollSnapAlign: "start" }}
          >
            {items.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-[5px]"
                style={{ background: h.done ? "rgba(125,107,181,.14)" : "rgba(255,255,255,.45)" }}
              >
                <span className={clsx("flex-1 min-w-0 text-[9.5px] truncate", h.done ? "font-bold text-charcoal" : "font-medium text-charcoal-faint")}>
                  {h.label}
                </span>
                <span
                  className="w-3.5 h-3.5 rounded shrink-0 flex items-center justify-center"
                  style={
                    h.done
                      ? { background: "rgb(var(--c-team-lavender-deep))", border: "1.5px solid rgb(var(--c-team-lavender-deep))" }
                      : { background: "transparent", border: "1.5px solid rgba(125,107,181,.3)" }
                  }
                >
                  {h.done && <Check size={9} className="text-white" strokeWidth={3} />}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      {pages.length > 1 && (
        <div className="flex items-center justify-between gap-2.5 pt-1 pb-px">
          <span className="text-[8.5px] font-semibold whitespace-nowrap text-primary-deep-text/[0.68] dark:text-primary-deep-text">For more habits, swipe.</span>
          <span className="flex gap-1" aria-hidden>
            {pages.map((_, i) => (
              <span
                key={i}
                className={clsx("w-1.5 h-1.5 rounded-full shrink-0", i === page ? "bg-team-lavender-deep" : "bg-team-lavender-deep/[0.28]")}
              />
            ))}
          </span>
        </div>
      )}
    </div>
  );
};
