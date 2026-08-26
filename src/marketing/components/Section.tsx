import React from "react";
import clsx from "clsx";

export const Section: React.FC<{
  children: React.ReactNode;
  className?: string;
  id?: string;
  narrow?: boolean;
}> = ({ children, className, id, narrow }) => (
  <section id={id} className={clsx("py-20 sm:py-28", className)}>
    <div className={clsx("mx-auto px-5 sm:px-8", narrow ? "max-w-3xl" : "max-w-6xl")}>{children}</div>
  </section>
);
