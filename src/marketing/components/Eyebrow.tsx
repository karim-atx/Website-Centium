import React from "react";
import clsx from "clsx";

type Tone = "accent" | "teal" | "faint" | "dark-accent";

const toneClasses: Record<Tone, string> = {
  accent: "text-mkt-accent",
  teal: "text-mkt-teal",
  faint: "text-mkt-faint",
  "dark-accent": "text-mkt-dark-accent",
};

/** The small letter-spaced label used above every section heading in the
 *  hi-fi system — e.g. "THE PLATFORM", "PRICING". Kept as its own component
 *  so the tracking/size/weight stay identical everywhere it appears. */
export const Eyebrow: React.FC<{ children: React.ReactNode; tone?: Tone; className?: string }> = ({
  children,
  tone = "accent",
  className,
}) => (
  <span className={clsx("block font-semibold text-[11px] tracking-[.22em]", toneClasses[tone], className)}>
    {children}
  </span>
);
