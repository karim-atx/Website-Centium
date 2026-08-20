import React from "react";
import clsx from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  padded = true,
  interactive = false,
  className,
  children,
  ...rest
}) => {
  return (
    <div
      className={clsx(
        "bg-cream-card rounded-3xl shadow-soft border border-charcoal/[0.04]",
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
