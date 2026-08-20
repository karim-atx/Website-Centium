import React from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "ember" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-sohati text-white hover:bg-sohati-dark shadow-soft",
  secondary: "bg-cream-soft text-charcoal hover:bg-sohati-pale",
  ghost: "bg-transparent text-charcoal hover:bg-cream-soft",
  ember: "bg-ember text-white hover:bg-ember-dark shadow-soft",
  outline: "bg-transparent border-2 border-charcoal/10 text-charcoal hover:border-sohati/40",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-sm px-3.5 py-2 rounded-xl",
  md: "text-sm px-5 py-3 rounded-2xl",
  lg: "text-base px-6 py-4 rounded-2xl",
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  ...rest
}) => {
  return (
    <button
      className={clsx(
        "tap font-semibold inline-flex items-center justify-center gap-2 transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
};
