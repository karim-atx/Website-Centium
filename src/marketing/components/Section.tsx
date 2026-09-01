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
}> = ({ children, className, id, narrow, navDark }) => (
  <section id={id} data-nav-dark={navDark ? "" : undefined} className={clsx("py-20 sm:py-28", className)}>
    <div className={clsx("mx-auto px-5 sm:px-10", narrow ? "max-w-3xl" : "max-w-[1180px]")}>{children}</div>
  </section>
);
