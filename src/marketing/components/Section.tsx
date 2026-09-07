import React from "react";
import clsx from "clsx";

export const Section: React.FC<{
  children: React.ReactNode;
  className?: string;
  id?: string;
  narrow?: boolean;
  /** Marks this section for useNavTheme: the transparent nav flips to its
   *  light-on-dark palette while this section spans the nav's mid-line. */
  navDark?: boolean;
  /** Escape hatch for section-specific vertical rhythm (e.g. a section that
   *  needs to sit closer to its neighbor than the default py-20/28) — the
   *  v3 landing handoff varies this per-section rather than using one fixed
   *  padding everywhere. */
  style?: React.CSSProperties;
}> = ({ children, className, id, narrow, navDark, style }) => (
  <section id={id} data-nav-dark={navDark ? "" : undefined} className={clsx("py-20 sm:py-28", className)} style={style}>
    <div className={clsx("mx-auto px-5 sm:px-10", narrow ? "max-w-3xl" : "max-w-[1180px]")}>{children}</div>
  </section>
);
