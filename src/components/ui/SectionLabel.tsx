import React from "react";
import clsx from "clsx";

// Mobile v5.1 handover: the one section-label style for every screen, per the
// decision on conflict C-05 ("lavender with the line"). Foundations
// `label.section.settings`: 11 / 600 uppercase, 0.14em tracking, with a 1.5 px
// `primary` line underneath (Foundations 2.3, hairlines). The board's label
// block is 23 tall: a 14 px line, then 7.5 px, then the rule.
//
// THE INK IS THE BOARD'S primary.accent (#7D67D9) in light mode (decision 14)
// and primary-dark in dark mode; both follow the colour theme like every
// primary-* token. See .section-label in index.css.
export const SectionLabel: React.FC<{
  children: React.ReactNode;
  /** Pass to point a region's aria-labelledby at the label. */
  id?: string;
  /** Heading level for the document outline; defaults to h2. */
  as?: "h2" | "h3" | "p";
  className?: string;
}> = ({ children, id, as: Tag = "h2", className }) => (
  <Tag
    id={id}
    className={clsx(
      "text-[11px] font-semibold uppercase tracking-[0.14em] leading-[14px] text-primary-dark",
      "pb-[7.5px] border-b-[1.5px] border-primary",
      className
    )}
  >
    {children}
  </Tag>
);
