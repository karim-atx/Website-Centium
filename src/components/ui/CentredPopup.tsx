import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { CtaButton, type CtaButtonProps } from "./PinnedCta";

// Mobile v5.1 handover, Foundations 2.5 "Centred popup": a white card, radius
// 20, shadow.sheet, padding 24 x 20, at most 342 wide with 16 pt side margins,
// over backdrop.dim (40% + 2 px blur). An optional icon in a 48 pt
// primary.tint tile, title 18 / 800, body 13 / 500, and a full-width CTA
// (48 tall, radius 14) at the bottom.
//
// NO CLOSE BUTTON, BY DESIGN: tapping outside dismisses. Escape does too,
// which the board doesn't draw but a keyboard user needs. Motion is
// motion.base (250 ms, scale 0.96 to 1 plus fade); the app-wide reduce-motion
// rule already zeroes it.
//
// Used later for Referral, Contact us, Report a bug, Rate this app, booking
// confirmation, the membership pass and achievement detail.

export const CentredPopup: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  /** A 22 pt glyph, drawn in primary.accent inside the 48 pt tile. */
  icon?: React.ReactNode;
  /** Short line under the title. */
  body?: React.ReactNode;
  children?: React.ReactNode;
  /** The full-width button at the bottom of the card. */
  cta?: Omit<CtaButtonProps, "size" | "variant">;
  className?: string;
  /** Title size. 18 (Foundations) unless a frame draws otherwise; Referral
      (MO1.10) draws 19 / 800. */
  titleSize?: 18 | 19;
  /** Card width cap. 342 (Foundations) unless a frame draws otherwise;
      achievement detail (MO1.1.3.1) is padded 0 28, so 334 at 390. */
  maxWidth?: number;
  /** Body weight. 500 (Foundations) unless a frame draws otherwise;
      MO1.1.3.1 draws 13 / 400. */
  bodyWeight?: 400 | 500;
  /** The icon tile's size and radius. 48 / 14 (Foundations) unless a frame
      draws otherwise; MO1.1.3.1's medallion tile is 76 / 20. */
  iconWell?: { size: number; radius: number };
}> = ({
  open,
  onClose,
  title,
  icon,
  body,
  children,
  cta,
  className,
  titleSize = 18,
  maxWidth,
  bodyWeight = 500,
  iconWell,
}) => {
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    // Lock the page behind, move focus into the popup, and give it back to
    // whatever opened it on close.
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 16px)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 16px + var(--kb-inset, 0px))",
      }}
    >
      <div
        className="absolute inset-0 backdrop-blur-[2px] animate-fade-in"
        style={{ background: "var(--backdrop-dim)" }}
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={clsx(
          "relative w-full max-w-[342px] max-h-full overflow-y-auto overscroll-contain",
          "bg-cream-card rounded-[20px] px-5 py-6 outline-none animate-popup-in",
          className
        )}
        style={{ boxShadow: "var(--shadow-sheet)", ...(maxWidth ? { maxWidth } : null) }}
      >
        <div className="flex flex-col items-center text-center">
          {icon && (
            <span
              className={clsx(
                "bg-primary-pale text-primary-accent flex items-center justify-center mb-3.5 shrink-0",
                !iconWell && "w-12 h-12 rounded-[14px]"
              )}
              style={iconWell ? { width: iconWell.size, height: iconWell.size, borderRadius: iconWell.radius } : undefined}
            >
              {icon}
            </span>
          )}
          <h2
            id={titleId}
            className={clsx(
              titleSize === 19 ? "text-[19px]" : "text-[18px]",
              "font-extrabold leading-tight text-charcoal text-balance"
            )}
          >
            {title}
          </h2>
          {body && (
            <div
              className={clsx(
                "mt-1.5 text-[13px] leading-[1.55] text-charcoal-soft",
                bodyWeight === 400 ? "font-normal" : "font-medium"
              )}
            >
              {body}
            </div>
          )}
        </div>
        {children && <div className="mt-4">{children}</div>}
        {cta && <CtaButton {...cta} size="page" className={clsx("mt-5", cta.className)} />}
      </div>
    </div>,
    document.body
  );
};
