import React from "react";
import clsx from "clsx";

interface ChipProps extends React.HTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: React.ReactNode;
}

// Design refinement §5.3: idle/active/hover states, tighter padding+size.
// Chip rails must keep `overflow-x-auto no-scrollbar` (never `overflow:
// hidden`, which strands trailing chips) — unchanged at call sites.
export const Chip: React.FC<ChipProps> = ({ active, icon, className, children, ...rest }) => {
  return (
    <button
      className={clsx(
        "tap inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-[13px] py-[7px] text-xs border transition-colors duration-150",
        active
          ? "bg-primary text-white border-primary font-bold"
          : // `hover:font-bold` used to sit alongside these — going
            // semibold-to-bold on hover widens the text, which grows the
            // chip's box (it has no fixed width), which can push the
            // cursor outside it, un-hovering it, shrinking it back under
            // the cursor, re-hovering it... a self-triggering hover/unhover
            // loop that reads as a jittery flicker. Colour-only feedback
            // doesn't change box size, so it can't cause that loop.
            "bg-cream-card text-charcoal-soft border-charcoal/[0.11] font-semibold hover:bg-primary-pale hover:border-primary hover:text-primary-deep-text",
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
};
