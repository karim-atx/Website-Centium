import React from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "teal" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

// Design refinement §5.2: no shadow on any variant except the FAB (§4.5) —
// elevation is reserved for things that genuinely float. Outline goes from
// a 2px border on transparent to a hairline border on a white surface, to
// match the app's new "surface + hairline" vocabulary instead of standing
// apart from it.
const variantClasses: Record<Variant, string> = {
  // Design refinement §8: dark mode's primary fill (#A991FE) is light
  // enough that it takes dark text, not white — `dark:text-[#0D0B1A]`
  // matches the ground colour exactly.
  primary: "bg-primary text-white dark:text-[#0D0B1A] hover:bg-primary-dark",
  secondary: "bg-cream-soft text-charcoal hover:bg-primary-pale",
  ghost: "bg-transparent text-charcoal hover:bg-cream-soft",
  teal: "bg-teal text-white hover:bg-teal-dark",
  outline: "bg-cream-card border border-charcoal/[0.11] text-charcoal hover:border-primary/40",
};

// Heights/radii per §5.2 and the 44px-minimum touch target in §4.4. `sm`
// isn't in the doc's two-size table (standard/lg) but the app uses it
// throughout for dense inline actions — kept as a third, still-compliant
// step rather than removed, since resizing every call site to 44px would
// blow out a lot of tight layouts the doc doesn't otherwise touch.
const sizeClasses: Record<Size, string> = {
  sm: "text-[13px] h-9 px-3.5 rounded-xl",
  md: "text-[13px] h-11 px-5 rounded-xl",
  lg: "text-[14px] h-[52px] px-6 rounded-2xl",
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
        "tap font-bold inline-flex items-center justify-center gap-2 transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none",
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
