import React from "react";
import clsx from "clsx";

interface ChipProps extends React.HTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({ active, icon, className, children, ...rest }) => {
  return (
    <button
      className={clsx(
        "tap inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold border transition-colors duration-150",
        active
          ? "bg-sohati text-white border-sohati"
          : "bg-cream-card text-charcoal-soft border-charcoal/10 hover:border-sohati/40",
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
};
