import React, { useEffect, useState } from "react";
import clsx from "clsx";

const THRESHOLD = 140; // roughly sticky-nav height + a little breathing room

/** Sticky, scroll-spied left rail used on Product (section index) and the
 *  legal pages (table of contents). Hidden below lg — on narrower screens
 *  the sections just run in reading order instead.
 *
 *  Recomputes the active item directly from each tracked element's current
 *  position on every scroll/resize, rather than reacting to IntersectionObserver
 *  crossing events — that stayed correct on a normal scroll, but a fast flick
 *  or an instant jump back to the top could skip past the observed band
 *  entirely and leave a stale section highlighted. Recomputing from live
 *  positions means whatever is on screen is always what's highlighted. */
export const StickyIndex: React.FC<{ items: { id: string; label: string }[]; className?: string }> = ({
  items,
  className,
}) => {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const compute = () => {
      const targets = items
        .map((it) => document.getElementById(it.id))
        .filter((el): el is HTMLElement => !!el);
      if (!targets.length) return;

      // The active section is the last one whose top has scrolled up past
      // the threshold line; if none has yet (we're above the first
      // section), that first section is the correct default.
      let current = items[0].id;
      for (const el of targets) {
        if (el.getBoundingClientRect().top <= THRESHOLD) {
          current = el.id;
        } else {
          break;
        }
      }
      setActive(current);
    };

    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [items]);

  return (
    <nav className={clsx("hidden lg:flex flex-col gap-0.5 sticky top-28 self-start shrink-0", className)} aria-label="Section index">
      {items.map((it, i) => (
        <a
          key={it.id}
          href={`#${it.id}`}
          className={clsx(
            "px-3.5 py-2 border-l-2 text-[13px] font-semibold transition-colors",
            active === it.id ? "border-mkt-accent text-mkt-ink bg-white" : "border-transparent text-mkt-faint hover:text-mkt-soft"
          )}
        >
          {String(i + 1).padStart(2, "0")} {it.label}
        </a>
      ))}
    </nav>
  );
};
