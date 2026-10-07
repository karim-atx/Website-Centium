import React from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

// Mobile v5.1 handover, Foundations 2.5 "Pinned CTA" and "Pinned CTA row".
//
// TWO GEOMETRIES, per the decision on conflict C-01: 48 tall / radius 14 for
// a page CTA pinned above the navbar, 52 / radius 16 for a CTA inside a sheet.
// The handover's own page size, 44 / radius 12 ("base"), is opt-in through
// PinnedCta's `size`, for screens brought to their frame exactly; the default
// stays 48, so every other pinned CTA is unchanged.
//
// THE FILL IS primary-fill: the handover's #9A8CD6 in light mode (decision
// 14; see index.css). Dark mode keeps the lighter primary with near-black
// ink, the convention the app's Button already follows.

type CtaSize = "base" | "page" | "sheet";
type CtaVariant = "primary" | "secondary" | "outline";

const sizeClasses: Record<CtaSize, string> = {
  base: "h-11 rounded-xl",
  page: "h-12 rounded-[14px]",
  sheet: "h-[52px] rounded-2xl",
};

// Secondary (the left button of a CTA row): primary.tint fill with
// primary.deeper ink. Outline (WO1 "Browse starter programs"): the card
// surface with a 1 px rgba(143,104,246,0.28) border and text.primary ink.
const variantClasses: Record<CtaVariant, string> = {
  primary: "bg-primary-fill text-on-primary-fill",
  secondary: "bg-primary-pale text-primary-deep-text",
  outline: "bg-cream-card text-charcoal border border-th-8f68f6/[0.28]",
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

type IconCtaProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  onAnchor?: (el: HTMLButtonElement | null) => void;
  /** Width in pt (default 89, MO1.1.2's FolderCog); MO1.1.4's Reset is 44. */
  width?: number;
  /** Colour overrides, e.g. to keep a replaced button's light colours. */
  className?: string;
  disabled?: boolean;
  /** Set by PinnedCta from its own `size`. */
  size?: "base" | "page";
};

/** The pinned row's icon-only secondary button. */
const IconCta: React.FC<IconCtaProps> = ({ icon, label, onClick, onAnchor, width = 89, className, disabled, size = "page" }) => (
  <button
    ref={onAnchor}
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
    style={{ width }}
    className={clsx(
      "tap flex-none inline-flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none",
      "transition-[filter] duration-150 ease-out active:brightness-[0.92]",
      sizeClasses[size],
      variantClasses.secondary,
      className
    )}
  >
    {icon}
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
 *
 * `trailing` (MO1.1.2 Journal): an 89 pt icon-only secondary button AFTER
 * the primary, e.g. FolderCog. `onAnchor` hands over its element for a menu.
 */
export const PinnedCta: React.FC<{
  primary: Omit<CtaButtonProps, "size" | "variant">;
  secondary?: Omit<CtaButtonProps, "size" | "variant">;
  above?: Omit<CtaButtonProps, "size" | "variant">;
  trailing?: Omit<IconCtaProps, "size">;
  /** "base": the handover's 44 / radius 12 page CTA (Foundations 2.5). Default "page" (48 / 14). */
  size?: "base" | "page";
}> = ({ primary, secondary, above, trailing, size = "page" }) => (
  <PinnedSlot>
    {above && <CtaButton {...above} size={size} variant="outline" />}
    <div className="flex gap-2">
      {secondary && <CtaButton {...secondary} size={size} variant="secondary" />}
      <CtaButton {...primary} size={size} variant="primary" />
      {trailing && <IconCta {...trailing} size={size} />}
    </div>
  </PinnedSlot>
);

/**
 * The pinned CTA's position on its own, for something that takes the
 * button's place (MO1.1.1.1: Add habit turns into the add panel). With
 * `aboveKeyboard`, it rides 8 pt above the on-screen keyboard while one is
 * open, since the panel holds a text field.
 */
export const PinnedSlot: React.FC<{ aboveKeyboard?: boolean; children: React.ReactNode }> = ({ aboveKeyboard, children }) =>
  createPortal(
    <div
      className={clsx(
        "fixed z-20 flex flex-col gap-2",
        "left-[calc(var(--app-gutter)+16px)] right-[calc(var(--app-gutter)+16px)]",
        // The client navbar floats at every width, so this holds at desktop
        // sizes too.
        aboveKeyboard
          ? "bottom-[max(calc(env(safe-area-inset-bottom)+96px+var(--active-bar,0px)),calc(var(--kb-inset,0px)+8px))]"
          : "bottom-[calc(env(safe-area-inset-bottom)+96px+var(--active-bar,0px))]"
      )}
    >
      {children}
    </div>,
    document.body
  );
