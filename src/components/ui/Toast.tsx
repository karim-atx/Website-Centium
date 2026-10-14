import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Check, CircleCheck } from "lucide-react";
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
 * rgba(36,31,27,0.28), stroke 2.4, its Undo / action 800 (AN14-048). Bottom
 * 96 above the home indicator
 * (20 above the navbar); `bottom` lifts it above a fixed CTA (150 in
 * OpsTabsV4, 152 in MA1). It slides up in 220 ms. The client toast is unchanged.
 * "more" (BizMoreV8, MO1B-019): r14, no shadow, gap 8, 12.5 / 700, a plain
 * check 15 / 2.6 (no circle) in the X-08 icon colour.
 * "listing" (ClassFlowsV8, AN3-080 row 14): r16, shadow 0 10px 28px
 * rgba(0,0,0,0.25), and the only business toast that inverts in dark
 * (#F5F3FA with #121317 ink); circle-check 18 in currentColor; the action is
 * 12/800 at opacity 0.85 in the toast ink, padding 2 4, r8.
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
  shape?: "ops" | "market" | "more" | "listing";
  /** Business: distance from the bottom above the home indicator (default 96). */
  bottom?: number;
  /** A general action button (business; on the client toast too, after Undo). */
  action?: { label: string; onClick: () => void };
  /**
   * Client toast only: "error" is the shared write-failure toast ("Couldn't
   * save. Try again."): #FBE7E4 with #C0392B text and icon, dark #3C2A30 with
   * #F09A8E (the handover's error banner colours); the text wraps. `bottom`
   * (default 88) also applies to the client toast, to lift it above a pinned CTA.
   */
  tone?: "default" | "error";
}> = ({ open, message, onUndo, onExpire, duration, icon, variant = "client", shape = "ops", bottom, action, tone = "default" }) => {
  const error = tone === "error";
  const business = variant === "business";
  const hold = duration ?? (business ? BUSINESS_TOAST_MS : TOAST_MS);
  const dark = useIsDark();
  // Latest callbacks, so the timer doesn't restart on every render.
  const expire = useRef(onExpire);
  expire.current = onExpire;

  // BU AN3-053 O2 (WCAG 2.2.1): the timer pauses while the toast has keyboard
  // focus or a mouse over it, and restarts at the full hold on leave.
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  useEffect(() => {
    if (!open || paused) return;
    const id = window.setTimeout(() => expire.current?.(), hold);
    return () => window.clearTimeout(id);
  }, [open, message, hold, paused]);
  const pauseProps = {
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && setHovered(true),
    onPointerLeave: () => setHovered(false),
    onFocus: () => setFocused(true),
    onBlur: (e: React.FocusEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
    },
  };

  if (!open) return null;

  const actionButton = (label: string, onClick: () => void, weight = 700) => (
    <button onClick={onClick} className="tap flex-none" style={{ color: "rgb(var(--thi-c3b3fb))", fontWeight: weight, minHeight: 32 }}>
      {label}
    </button>
  );

  if (business) {
    const market = shape === "market";
    const more = shape === "more";
    const listing = shape === "listing";
    const ink = listing && dark ? "#121317" : "#FFFFFF";
    return createPortal(
      <div
        role="status"
        {...pauseProps}
        className="fixed z-[75] flex items-center"
        style={{
          left: "calc(var(--app-gutter) + 16px)",
          right: "calc(var(--app-gutter) + 16px)",
          bottom: `calc(env(safe-area-inset-bottom) + ${bottom ?? 96}px)`,
          gap: more ? 8 : 10,
          background: listing && dark ? "#F5F3FA" : "#241F1B",
          borderRadius: market || more ? 14 : 16,
          padding: "12px 14px",
          boxShadow: listing ? "0 10px 28px rgba(0,0,0,0.25)" : more ? "none" : market ? "0 12px 30px rgba(36,31,27,0.28)" : "0 10px 26px rgba(36,31,27,0.28)",
          color: ink,
          fontSize: textPx(more ? 12.5 : 13),
          lineHeight: linePx(18),
          fontWeight: 700,
          animation: "business-toast-in .22s cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
        <style>{`@keyframes business-toast-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        {icon ?? (more ? (
          <Check size={15} strokeWidth={2.6} aria-hidden className="flex-none" style={{ color: dark ? "#A2C8C2" : "#7FC79C" }} />
        ) : (
          <CircleCheck
            size={18}
            strokeWidth={market ? 2.4 : 2.2}
            aria-hidden
            className="flex-none"
            style={{ color: listing ? "currentColor" : dark ? "#A2C8C2" : "#7FC79C" }}
          />
        ))}
        <span className="flex-1 min-w-0 break-words">{message}</span>
        {onUndo && actionButton("Undo", onUndo, market ? 800 : 700)}
        {action &&
          (listing ? (
            <button
              type="button"
              onClick={action.onClick}
              className="tap flex-none whitespace-nowrap [html.high-contrast_&]:!opacity-100"
              style={{ color: ink, opacity: 0.85, fontSize: textPx(12), fontWeight: 800, padding: "2px 4px", borderRadius: 8 }}
            >
              {action.label}
            </button>
          ) : (
            actionButton(action.label, action.onClick, market ? 800 : 700)
          ))}
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      role="status"
      {...pauseProps}
      className="fixed z-[75] flex items-center animate-fade-slide-up"
      style={{
        left: "calc(var(--app-gutter) + 16px)",
        right: "calc(var(--app-gutter) + 16px)",
        bottom: `calc(env(safe-area-inset-bottom) + ${bottom ?? 88}px + var(--active-bar, 0px))`,
        gap: 10,
        background: error ? (dark ? "#3C2A30" : "#FBE7E4") : "#241F1B",
        borderRadius: 12,
        padding: "11px 14px",
        color: error ? (dark ? "#F09A8E" : "#C0392B") : "#FFFFFF",
        fontSize: textPx(12.5),
        fontWeight: 600,
      }}
    >
      {icon ??
        (error ? (
          <AlertCircle size={15} strokeWidth={2.4} className="flex-none" aria-hidden />
        ) : (
          <Check size={15} strokeWidth={2.6} className="flex-none" style={{ color: "rgb(var(--thi-a2c8c2))" }} />
        ))}
      <span className={error ? "flex-1 min-w-0 break-words" : "flex-1 min-w-0 truncate"}>{message}</span>
      {onUndo && actionButton("Undo", onUndo)}
      {action && actionButton(action.label, action.onClick)}
    </div>,
    document.body
  );
};
