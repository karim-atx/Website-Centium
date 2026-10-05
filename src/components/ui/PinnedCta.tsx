import React from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

// Mobile v5.1 handover, Foundations 2.5 "Pinned CTA" and "Pinned CTA row".
//
// TWO GEOMETRIES, per the decision on conflict C-01: 48 tall / radius 14 for
// a page CTA pinned above the navbar, 52 / radius 16 for a CTA inside a sheet.
// The handover's third size (44 / 12) is not offered.
//
// THE FILL IS primary-fill, NOT THE HANDOVER'S #9A8CD6. That shade carries
// white at 2.96:1; primary-fill is the closest brand shade that clears 4.5:1
// in every theme (see index.css). Dark mode keeps the lighter primary with
// near-black ink, the convention the app's Button already follows.

type CtaSize = "page" | "sheet";
type CtaVariant = "primary" | "secondary" | "outline";

const sizeClasses: Record<CtaSize, string> = {
  page: "h-12 rounded-[14px]",
  sheet: "h-[52px] rounded-2xl",
};

// Secondary (the left button of a CTA row): primary.tint fill with
// primary.deeper ink. Outline (WO1 "Browse starter programs"): the card
// surface with a 1 px rgba(143,104,246,0.28) border and text.primary ink.
const variantClasses: Record<CtaVariant, string> = {
  primary: "bg-primary-fill text-on-primary-fill",
  secondary: "bg-primary-pale text-primary-deep-text",
  outline: "bg-cream-card text-charcoal border border-[rgba(143,104,246,0.28)]",
};

export interface CtaButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: string;
  /** Optional 15 pt leading icon, e.g. <Plus size={15} />. */
  icon?: React.ReactNode;
  size?: CtaSize;
  variant?: CtaVariant;
  /** Spinner replaces the icon, the label stays, and taps are ignored. */
  loading?: boolean;
}

/**
 * One filled call-to-action button. Use it on its own inside a sheet's footer
 * (size "sheet"), or let PinnedCta pin one or two of them above the navbar.
 * Pressed darkens the fill 8%; disabled is 40% and not tappable.
 */
export const CtaButton: React.FC<CtaButtonProps> = ({
  label,
  icon,
  size = "sheet",
  variant = "primary",
  loading = false,
  disabled,
  className,
  onClick,
  type = "button",
  ...rest
}) => (
  <button
    type={type}
    disabled={disabled}
    aria-busy={loading || undefined}
    onClick={loading ? undefined : onClick}
    className={clsx(
      "tap w-full min-w-0 inline-flex items-center justify-center gap-[7px] px-4 text-[14px] font-bold leading-none",
      "transition-[filter] duration-150 ease-out active:brightness-[0.92]",
      "disabled:opacity-40 disabled:pointer-events-none",
      loading && "cursor-progress",
      sizeClasses[size],
      variantClasses[variant],
      className
    )}
    {...rest}
  >
    {loading ? <Loader2 size={15} className="animate-spin shrink-0" aria-hidden /> : icon}
    <span className="truncate">{label}</span>
  </button>
);

/**
 * A page's pinned CTA, or a pinned CTA row: fixed 16 pt in from the app
 * column's edges, 96 pt above the bottom (clear of the navbar), with the
 * secondary button first when there are two (gap 8). `above` stacks one
 * outline button 8 pt over it (WO1: "Browse starter programs" over "Create
 * routine"); that page then needs 56 pt more bottom padding (228 in all).
 *
 * PORTALED TO <body>. A screen wrapper with `animate-fade-slide-up` has a
 * transform, which makes it the containing block for position: fixed, and
 * the button would pin to that wrapper instead of the viewport.
 *
 * The page underneath must leave room for it: 172 pt of bottom padding,
 * per Foundations 2.3, so the last row scrolls fully clear.
 */
export const PinnedCta: React.FC<{
  primary: Omit<CtaButtonProps, "size" | "variant">;
  secondary?: Omit<CtaButtonProps, "size" | "variant">;
  above?: Omit<CtaButtonProps, "size" | "variant">;
}> = ({ primary, secondary, above }) =>
  createPortal(
    <div
      className={clsx(
        "fixed z-20 flex flex-col gap-2",
        "left-[calc(var(--app-gutter)+16px)] right-[calc(var(--app-gutter)+16px)]",
        // The client navbar floats at every width, so this holds at desktop
        // sizes too.
        "bottom-[calc(env(safe-area-inset-bottom)+96px+var(--active-bar,0px))]"
      )}
    >
      {above && <CtaButton {...above} size="page" variant="outline" />}
      <div className="flex gap-2">
        {secondary && <CtaButton {...secondary} size="page" variant="secondary" />}
        <CtaButton {...primary} size="page" variant="primary" />
      </div>
    </div>,
    document.body
  );
