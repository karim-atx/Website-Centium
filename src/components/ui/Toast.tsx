import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Check, CircleCheck } from "lucide-react";
import { linePx, textPx } from "../../theme/textSize";
import { useIsDark } from "../../hooks/useIsDark";

/** How long a toast stays up. The handover gives no duration. */
export const TOAST_MS = 5000;
/** The business toast's hold (BU class-save-flow SPEC: 3 s). */
export const BUSINESS_TOAST_MS = 3000;

/**
 * The shared toast, handover 2026-09-29 02 "Undo toast": #241F1B, radius 12,
 * 12.5px/600 white, a teal check #A2C8C2 and an optional "Undo" in #C3B3FB.
 * Undo restores exactly while the toast is visible; when it expires,
 * onExpire runs (e.g. the deferred server delete).
 *
 * Sits inside the 430px app column, above the nav and the home indicator.
 *
 * `variant="business"` (v6 X-08): one business toast, #241F1B with white text
 * in both modes (the only measured dark toast, AN3-054), a circle-check 18 in
 * #7FC79C as the light frames draw it (#A2C8C2 in dark, AN3-054), padding
 * 12 14, gap 10, 13 / 18 700 text that wraps, 3000 ms, an optional action
 * (`action`, any label). Shape per drawing component through `shape`:
 * "ops" (OpsTabsV4, default) r16, shadow 0 10px 26px rgba(36,31,27,0.28),
 * check stroke 2.2; "market" (MA1) r14, shadow 0 12px 30px
 * rgba(36,31,27,0.28), stroke 2.4. Bottom 96 above the home indicator
 * (20 above the navbar); `bottom` lifts it above a fixed CTA (150 in
 * OpsTabsV4, 152 in MA1). It slides up in 220 ms. The client toast is unchanged.
 */
export const Toast: React.FC<{
  open: boolean;
  message: string;
  onUndo?: () => void;
  /** The toast timed out or was replaced without Undo. */
  onExpire?: () => void;
  duration?: number;
  /** Replaces the check (WO3.1 "Workout deleted." shows a bin). */
  icon?: React.ReactNode;
  /** "client" (default, unchanged) or "business" (X-08). */
  variant?: "client" | "business";
  /** Business: which drawing component's shape. */
  shape?: "ops" | "market";
  /** Business: distance from the bottom above the home indicator (default 96). */
  bottom?: number;
  /** A general action button (business; on the client toast too, after Undo). */
  action?: { label: string; onClick: () => void };
}> = ({ open, message, onUndo, onExpire, duration, icon, variant = "client", shape = "ops", bottom, action }) => {
  const business = variant === "business";
  const hold = duration ?? (business ? BUSINESS_TOAST_MS : TOAST_MS);
  const dark = useIsDark();
  // Latest callbacks, so the timer doesn't restart on every render.
  const expire = useRef(onExpire);
  expire.current = onExpire;

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => expire.current?.(), hold);
    return () => window.clearTimeout(id);
  }, [open, message, hold]);

  if (!open) return null;

  const actionButton = (label: string, onClick: () => void) => (
    <button onClick={onClick} className="tap flex-none" style={{ color: "rgb(var(--thi-c3b3fb))", fontWeight: 700, minHeight: 32 }}>
      {label}
    </button>
  );

  if (business) {
    const market = shape === "market";
    return createPortal(
      <div
        role="status"
        className="fixed z-[75] flex items-center"
        style={{
          left: "calc(var(--app-gutter) + 16px)",
          right: "calc(var(--app-gutter) + 16px)",
          bottom: `calc(env(safe-area-inset-bottom) + ${bottom ?? 96}px)`,
          gap: 10,
          background: "#241F1B",
          borderRadius: market ? 14 : 16,
          padding: "12px 14px",
          boxShadow: market ? "0 12px 30px rgba(36,31,27,0.28)" : "0 10px 26px rgba(36,31,27,0.28)",
          color: "#FFFFFF",
          fontSize: textPx(13),
          lineHeight: linePx(18),
          fontWeight: 700,
          animation: "business-toast-in .22s cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
        <style>{`@keyframes business-toast-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        {icon ?? (
          <CircleCheck
            size={18}
            strokeWidth={market ? 2.4 : 2.2}
            aria-hidden
            className="flex-none"
            style={{ color: dark ? "#A2C8C2" : "#7FC79C" }}
          />
        )}
        <span className="flex-1 min-w-0 break-words">{message}</span>
        {onUndo && actionButton("Undo", onUndo)}
        {action && actionButton(action.label, action.onClick)}
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      role="status"
      className="fixed z-[75] flex items-center animate-fade-slide-up"
      style={{
        left: "calc(var(--app-gutter) + 16px)",
        right: "calc(var(--app-gutter) + 16px)",
        bottom: "calc(env(safe-area-inset-bottom) + 88px + var(--active-bar, 0px))",
        gap: 10,
        background: "#241F1B",
        borderRadius: 12,
        padding: "11px 14px",
        color: "#FFFFFF",
        fontSize: textPx(12.5),
        fontWeight: 600,
      }}
    >
      {icon ?? <Check size={15} strokeWidth={2.6} className="flex-none" style={{ color: "rgb(var(--thi-a2c8c2))" }} />}
      <span className="flex-1 min-w-0 truncate">{message}</span>
      {onUndo && actionButton("Undo", onUndo)}
      {action && actionButton(action.label, action.onClick)}
    </div>,
    document.body
  );
};
