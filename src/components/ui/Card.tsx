import React from "react";
import clsx from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  interactive?: boolean;
  // Design refinement §5.1/§4.5: "elevation earns meaning" — in-page cards
  // use a hairline border, not a shadow. `elevated` keeps the old
  // shadow-soft treatment for the handful of genuinely floating cases.
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  padded = true,
  interactive = false,
  elevated = false,
  className,
  children,
  ...rest
}) => {
  return (
    <div
      className={clsx(
        "bg-cream-card rounded-3xl border border-charcoal/[0.11]",
        elevated && "shadow-soft",
        padded && "p-5",
        interactive && "tap cursor-pointer hover:shadow-card transition-shadow duration-200",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
};
