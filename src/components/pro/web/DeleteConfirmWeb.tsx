import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { t } from "../../../i18n/core";

/**
 * WP-NU-MP.10 mn-delete (WP-NU-MP Sheets Web, the pop): on web a template's
 * delete confirm is the frame's centred 400 card (r24, padding 24, centred
 * text), the title 20/28 800, the line 13/20 #5B5349, then Delete (#C0392B)
 * over Cancel (#F5F5F6), each 44 high r14 15/700, 8 apart and 20 below the
 * text. Esc and a click outside cancel; Delete takes focus on open.
 */
export const DeleteConfirmWeb: React.FC<{
  open: boolean;
  title: string;
  line?: string;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ open, title, line, onCancel, onConfirm }) => {
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef(onCancel);
  useEffect(() => {
    cancelRef.current = onCancel;
  }, [onCancel]);
  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      back?.focus?.({ preventScroll: true });
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 animate-fade-in" style={{ background: "rgba(36,31,27,0.18)" }} onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full text-center animate-popup-in"
        style={{ maxWidth: 400, boxSizing: "border-box", background: "#FFFFFF", borderRadius: 24, boxShadow: "0 20px 60px rgba(36,31,27,0.22)", padding: 24 }}
      >
        <p style={{ margin: 0, fontSize: 20, lineHeight: "28px", fontWeight: 800, color: "#241F1B" }}>{title}</p>
        {line && <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>{line}</p>}
        <div className="flex flex-col" style={{ marginTop: 20, gap: 8 }}>
          <button ref={confirmRef} type="button" onClick={onConfirm} className="tap" style={{ height: 44, borderRadius: 14, background: "#C0392B", color: "#FFFFFF", fontSize: 15, fontWeight: 700 }}>
            {t("Delete")}
          </button>
          <button type="button" onClick={onCancel} className="tap" style={{ height: 44, borderRadius: 14, background: "#F5F5F6", color: "#241F1B", fontSize: 15, fontWeight: 700 }}>
            {t("Cancel")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
