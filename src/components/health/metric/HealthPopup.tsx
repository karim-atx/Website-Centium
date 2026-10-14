import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useBackCloses } from "../../../hooks/useBackCloses";
import { textPx, linePx } from "../../../theme/textSize";
import { useHealthMode } from "./MetricKit";

/**
 * The Health centred popup, HE1.6.a #50-#59 literal: scrim #241F1B@40% (dark
 * UNSPECIFIED*, #000000@55%), card 350 wide pad 20 r24 white + shadow (dark
 * #1C1F28, shadow off); header = tile 36 r11 + gap 10 + title 17/25.5 800
 * ls-0.3 and a meta line 12/18 600 #5B5349; body m-top 14 13/20.2 400; an
 * optional text link m-top 12 12/18 700 #7D6BB5 (dark #C3B3FB); two buttons
 * 46 tall r14 14/21 700 gap 8, m-top 16: secondary outline 0.5px #241F1B@14%
 * ink #5B5349, primary #9A8CD6 white (dark #A991FE / #0D0B1A) or destructive
 * #FCEDEC / #B4372C (dark #3C2A30 / #F09A8E, OURS-health-delete-confirm).
 * Reused by the delete confirm and the water Custom popup (OURS).
 */
export const HealthPopup: React.FC<{
  open: boolean;
  onClose: () => void;
  /** Backdrop tap closes (HE1.6.a: no; delete / custom: yes). */
  dismissOnBackdrop?: boolean;
  tile?: { background: string; darkBackground: string; icon: React.ReactNode };
  title: string;
  meta?: React.ReactNode;
  body?: React.ReactNode;
  link?: { label: string; onClick: () => void };
  secondary: { label: string; onClick: () => void };
  primary: { label: string; onClick: () => void; tone?: "primary" | "destructive"; disabled?: boolean };
  role?: "dialog" | "alertdialog";
  children?: React.ReactNode;
}> = ({ open, onClose, dismissOnBackdrop = true, tile, title, meta, body, link, secondary, primary, role = "dialog", children }) => {
  useBackCloses(open, onClose);
  const { dark, hc } = useHealthMode();
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);
  if (!open) return null;

  const destructive = primary.tone === "destructive";
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5" style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
      <div
        aria-hidden
        className="absolute inset-0 animate-fade-in"
        style={{ background: dark ? "rgba(0,0,0,0.55)" : "rgba(36,31,27,0.4)" }}
        onClick={dismissOnBackdrop ? onClose : undefined}
      />
      <div
        ref={cardRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-h-full overflow-y-auto outline-none animate-popup-in"
        style={{ maxWidth: 350, padding: 20, borderRadius: 24, background: dark ? "#1C1F28" : "#FFFFFF", boxShadow: dark ? "none" : "var(--shadow-popup, var(--shadow-sheet))" }}
      >
        <div className="flex items-center" style={{ gap: 10 }}>
          {tile && (
            <span className="shrink-0 grid place-items-center" style={{ width: 36, height: 36, borderRadius: 11, background: dark ? tile.darkBackground : tile.background }} aria-hidden>
              {tile.icon}
            </span>
          )}
          <div className="min-w-0">
            <h2 id={titleId} style={{ fontSize: textPx(17), lineHeight: linePx(25.5), fontWeight: 800, letterSpacing: -0.3, color: "rgb(var(--c-charcoal))" }}>
              {title}
            </h2>
            {meta && <p style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>{meta}</p>}
          </div>
        </div>
        {body && <div style={{ marginTop: 14, fontSize: textPx(13), lineHeight: linePx(20.2), fontWeight: 400, color: "rgb(var(--c-charcoal))" }}>{body}</div>}
        {children}
        {link && (
          <button
            type="button"
            onClick={link.onClick}
            className="tap block relative before:absolute before:-inset-y-[13px] before:inset-x-0 before:content-['']"
            style={{ marginTop: 12, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: hc && !dark ? "#4B3BA0" : dark ? "rgb(var(--th-c3b3fb))" : "rgb(var(--th-7d6bb5))" }}
          >
            {link.label}
          </button>
        )}
        <div className="flex" style={{ marginTop: 16, gap: 8 }}>
          <button
            type="button"
            onClick={secondary.onClick}
            className="tap flex-1 min-w-0"
            style={{
              height: 46,
              borderRadius: 14,
              fontSize: textPx(14),
              lineHeight: linePx(21),
              fontWeight: 700,
              color: "rgb(var(--c-charcoal-soft))",
              border: `0.5px solid ${hc ? "rgb(var(--c-charcoal) / 0.3)" : dark ? "rgba(245,243,250,0.14)" : "rgba(36,31,27,0.14)"}`,
            }}
          >
            {secondary.label}
          </button>
          <button
            type="button"
            onClick={primary.onClick}
            disabled={primary.disabled}
            className={`tap flex-1 min-w-0 disabled:opacity-40 `}
            style={{
              height: 46,
              borderRadius: 14,
              fontSize: textPx(14),
              lineHeight: linePx(21),
              fontWeight: 700,
              ...(destructive ? { background: dark ? "#3C2A30" : "#FCEDEC", color: dark ? "#F09A8E" : "#B4372C" } : { background: "rgb(var(--c-fill-pinned))", color: "rgb(var(--c-on-primary-fill))" }),
            }}
          >
            {primary.label}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
