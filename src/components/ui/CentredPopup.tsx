import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { CtaButton, type CtaButtonProps } from "./PinnedCta";
import { useBackCloses } from "../../hooks/useBackCloses";
import { useIsDark } from "../../hooks/useIsDark";

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
//
// v6 GEOMETRY (X-01): each drawn popup takes its frame's measured geometry.
// - "foundations" (default, unchanged): the v5.1 card above, 342 / r20 /
//   padding 24 × 20 / CTA 48, scrim with a 2 px blur.
// - "partB": the Part B tables (MO1.8.12, MO1.8.13, achievement detail,
//   Health B popups): 350 wide, r24, padding 20 on every side, shadow.sheet
//   in light and none in dark, no blur on the scrim, title 17 / 25.5 800
//   ls -0.3, CTA 46 tall on fill.pinned #9A8CD6 (dark #A991FE with #0D0B1A).
// - "ours": popups we design ourselves (OURS), the shared rule 342 / r22 /
//   CTA 48 (fill as foundations).
// `align="start"` left-aligns the header (MO1.8.12's list popup, no icon).
// The scrim is backdrop.dim rgba(36,31,27,0.4) in both modes (X-07).

export type CentredPopupGeometry = "foundations" | "partB" | "ours";

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
  titleSize?: 18 | 19 | 21;
  /** Title ink class in place of text-charcoal (MO1.4.4.2 "You're booked":
      21 / 800 primary.deeper). Unset keeps every other popup as it is. */
  titleInk?: string;
  /** Draw the icon bare, with no primary.tint tile (MO1.4.4.2's Centium
      mark). Unset keeps the tile. */
  iconBare?: boolean;
  /** Card width cap. 342 (Foundations) unless a frame draws otherwise;
      achievement detail (MO1.1.3.1) is padded 0 28, so 334 at 390. */
  maxWidth?: number;
  /** Body weight. 500 (Foundations) unless a frame draws otherwise;
      MO1.1.3.1 draws 13 / 400. */
  bodyWeight?: 400 | 500;
  /** The icon tile's size and radius. 48 / 14 (Foundations) unless a frame
      draws otherwise; MO1.1.3.1's medallion tile is 76 / 20. */
  iconWell?: { size: number; radius: number };
  /** v6 geometry (X-01): see the note above. Default "foundations". */
  geometry?: CentredPopupGeometry;
  /** Header alignment. "center" (default) or "start" (MO1.8.12). */
  align?: "center" | "start";
  /** Override the scrim blur: on for foundations / ours, off for partB. */
  scrimBlur?: boolean;
  /** Drawn right of the title on one row (HE1.9.3: the status word). Unset: unchanged. */
  titleAside?: React.ReactNode;
  /** Title size / line height / tracking classes in place of the geometry's
      (MO1.1.3.1 draws 19 / 24 800 ls -0.4 on the Part B card). */
  titleClass?: string;
  /** The dialog is aria-describedby its body line (MO1.1.3.1 O-6). */
  describeBody?: boolean;
  /** A downward drag of more than 24 px on the card closes it (MO1.1.3.1 S2). */
  swipeToClose?: boolean;
  /** role="alertdialog" instead of "dialog" (a confirmation; MO1.7 delete confirm). */
  alert?: boolean;
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
  titleInk,
  iconBare,
  geometry = "foundations",
  align = "center",
  scrimBlur,
  titleAside,
  titleClass,
  describeBody,
  swipeToClose,
  alert,
}) => {
  // Batch E (E5): the phone's back closes this first.
  useBackCloses(open, onClose);
  const dark = useIsDark();
  const titleId = useId();
  const bodyId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const swipeY = useRef<number | null>(null);
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
      if (e.key !== "Escape") return;
      // Stacked popups (MO1.8.12.1 over MO1.8.12): only the top one closes.
      const modals = document.querySelectorAll('[aria-modal="true"]');
      if (cardRef.current && modals.length > 1 && modals[modals.length - 1] !== cardRef.current) return;
      onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const partB = geometry === "partB";
  const blur = scrimBlur ?? !partB;
  const start = align === "start";
  const cardWidth = maxWidth ?? (partB ? 350 : 342);
  const cardRadius = partB ? 24 : geometry === "ours" ? 22 : 20;
  // Part B: shadow.sheet in light, off in dark (the tables' "shadow off").
  const shadow = partB && dark ? "none" : "var(--shadow-sheet)";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 16px)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 16px + var(--kb-inset, 0px))",
      }}
    >
      <div
        className={clsx("absolute inset-0 animate-fade-in", blur && "backdrop-blur-[2px]")}
        style={{ background: "var(--backdrop-dim)" }}
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={cardRef}
        role={alert ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describeBody && body ? bodyId : undefined}
        tabIndex={-1}
        onPointerDown={swipeToClose ? (e) => { swipeY.current = cardRef.current?.scrollTop ? null : e.clientY; } : undefined}
        onPointerUp={swipeToClose ? (e) => { const y = swipeY.current; swipeY.current = null; if (y !== null && e.clientY - y > 24) onClose(); } : undefined}
        onPointerCancel={swipeToClose ? () => { swipeY.current = null; } : undefined}
        className={clsx(
          "relative w-full max-h-full overflow-y-auto overscroll-contain",
          "bg-cream-card outline-none animate-popup-in",
          partB ? "p-5" : "px-5 py-6",
          className
        )}
        style={{ boxShadow: shadow, maxWidth: cardWidth, borderRadius: cardRadius }}
      >
        <div className={clsx("flex flex-col", start ? "items-start text-start" : "items-center text-center")}>
          {icon && (
            <span
              className={clsx(
                "flex items-center justify-center mb-3.5 shrink-0",
                !iconBare && "bg-primary-pale text-primary-accent",
                !iconWell && !iconBare && "w-12 h-12 rounded-[14px]"
              )}
              style={iconWell ? { width: iconWell.size, height: iconWell.size, borderRadius: iconWell.radius } : undefined}
            >
              {icon}
            </span>
          )}
          <h2
            id={titleId}
            className={clsx(
              titleClass ??
                (partB
                  ? "text-[17px] leading-[25.5px] tracking-[-0.3px]"
                  : clsx(titleSize === 21 ? "text-[21px]" : titleSize === 19 ? "text-[19px]" : "text-[18px]", "leading-tight")),
              "font-extrabold text-balance",
              titleInk ?? "text-charcoal"
            )}
          >
            {title}
          </h2>
          {titleAside && (
            <span className="absolute" style={{ top: partB ? 23.7 : 24, insetInlineEnd: 20 }}>
              {titleAside}
            </span>
          )}
          {body && (
            <div
              id={bodyId}
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
        {cta && (
          <CtaButton
            {...cta}
            size="page"
            className={clsx(partB ? "mt-3" : "mt-5", cta.className)}
            // Part B: 46 tall on fill.pinned (#9A8CD6 / #A991FE; #5B48B8 under
            // High contrast), ink on-primary-fill.
            style={partB ? { height: 46, background: "rgb(var(--c-fill-pinned))", ...cta.style } : cta.style}
          />
        )}
      </div>
    </div>,
    document.body
  );
};
