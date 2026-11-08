import type React from "react";
import { useEffect, useRef } from "react";

// Website viewport v1 · WB-FD (WB-FD Front Desk Web v4): the colour tokens and the
// dialog focus hook the Front desk web parts share (section 2 colour tokens).

export const INK = "#241F1B";
export const INK2 = "#5B5349";
export const MUTED = "#71685E";
export const FAINT = "#776E64";
export const BRAND = "#7D6BB5";
export const LAV = "#AEA1DC";
export const TINT = "#F0EDF9";
export const LIST_BG = "#F7F7FC";
export const RULE = "#EBEAF6";
export const CTA_BG = "#9A8CD6";
export const CARD_BORDER = "1px solid rgba(36,31,27,0.11)";
export const DIVIDER = "1px solid rgba(36,31,27,0.06)";

export type WebTone = "good" | "high" | "warn" | "pale" | "soft";
export const TONE: Record<WebTone, { bg: string; ink: string }> = {
  good: { bg: "#E3F3E9", ink: "#1D744A" },
  high: { bg: "#FBE7E4", ink: "#C0392B" },
  warn: { bg: "#F6E9C9", ink: "#8A6A3E" },
  pale: { bg: TINT, ink: BRAND },
  soft: { bg: "#F5F5F6", ink: MUTED },
};

/** Esc closes; focus moves into the panel on open and returns to what had it on close. */
export function useWebDialogFocus(open: boolean, onClose: () => void, panel: React.RefObject<HTMLElement | null>, initial?: string) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>(initial ?? "button, [href], input, [tabindex]:not([tabindex='-1'])");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      back?.focus?.();
    };
  }, [open, panel, initial]);
}

