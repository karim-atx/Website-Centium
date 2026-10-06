import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

/** How long a toast stays up. The handover gives no duration. */
export const TOAST_MS = 5000;

/**
 * The shared toast, handover 2026-09-29 02 "Undo toast": #241F1B, radius 12,
 * 12.5px/600 white, a teal check #A2C8C2 and an optional "Undo" in #C3B3FB.
 * Undo restores exactly while the toast is visible; when it expires,
 * onExpire runs (e.g. the deferred server delete).
 *
 * Sits inside the 430px app column, above the nav and the home indicator.
 */
export const Toast: React.FC<{
  open: boolean;
  message: string;
  onUndo?: () => void;
  /** The toast timed out or was replaced without Undo. */
  onExpire?: () => void;
  duration?: number;
  /** Replaces the teal check (WO3.1 "Workout deleted." shows a bin). */
  icon?: React.ReactNode;
}> = ({ open, message, onUndo, onExpire, duration = TOAST_MS, icon }) => {
  // Latest callbacks, so the timer doesn't restart on every render.
  const expire = useRef(onExpire);
  expire.current = onExpire;

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => expire.current?.(), duration);
    return () => window.clearTimeout(id);
  }, [open, message, duration]);

  if (!open) return null;
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
        fontSize: 12.5,
        fontWeight: 600,
      }}
    >
      {icon ?? <Check size={15} strokeWidth={2.6} className="flex-none" style={{ color: "rgb(var(--thi-a2c8c2))" }} />}
      <span className="flex-1 min-w-0 truncate">{message}</span>
      {onUndo && (
        <button onClick={onUndo} className="tap flex-none" style={{ color: "rgb(var(--thi-c3b3fb))", fontWeight: 700, minHeight: 32 }}>
          Undo
        </button>
      )}
    </div>,
    document.body
  );
};
