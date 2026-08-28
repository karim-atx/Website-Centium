import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";

/** Sticky, scroll-spied left rail used on Product (section index) and the
 *  legal pages (table of contents). Hidden below lg — on narrower screens
 *  the sections just run in reading order instead. */
export const StickyIndex: React.FC<{ items: { id: string; label: string }[]; className?: string }> = ({
  items,
  className,
}) => {
  const [active, setActive] = useState(items[0]?.id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const targets = items.map((it) => document.getElementById(it.id)).filter((el): el is HTMLElement => !!el);
    if (!targets.length) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );
    targets.forEach((t) => observerRef.current!.observe(t));
    return () => observerRef.current?.disconnect();
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
