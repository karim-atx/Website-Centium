import React from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import { useIsDark } from "../../hooks/useIsDark";

/**
 * The shared compact confirmation, handover 2026-09-29 02 "Compact
 * confirmation": a white card, radius 20, padding 20, shadow
 * 0 16px 40px rgba(0,0,0,0.2). Row 1: a 40px red-tinted trash chip
 * (#FCEDEC / #B4372C) with the title (16px/700) and sub-line (12.5px muted)
 * stacked to its right, vertically centred. Row 2: Cancel (white, #E4E4E9
 * border) and Delete (#C0392B), 44px, equal width.
 *
 * Mobile v5.1 R3, dark mode (no light islands): the card and Cancel take
 * cream-card, the inks charcoal / charcoal-muted; the trash chip is
 * danger.tint #3C2A30 with danger #FF6B5E (4.8:1), the Cancel border the
 * option border rgba(238,239,242,0.10). Delete keeps its white-on-red fill.
 */
export const ConfirmCard: React.FC<{
  open: boolean;
  title: string;
  subtitle?: string;
  confirmLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ open, title, subtitle, confirmLabel = "Delete", busy, onCancel, onConfirm }) => {
  const dark = useIsDark();
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-6">
      <div
        className="absolute inset-0 backdrop-blur-[2px] animate-fade-in"
        style={{ background: "rgba(36,31,27,0.4)" }}
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-label={title}
        className="relative w-full max-w-[340px] bg-cream-card animate-pop"
        style={{ borderRadius: 20, padding: 20, boxShadow: "0 16px 40px rgba(0,0,0,0.2)" }}
      >
        <div className="flex items-center" style={{ gap: 12 }}>
          <span
            className="flex-none flex items-center justify-center"
            style={{ width: 40, height: 40, borderRadius: 12, background: dark ? "#3C2A30" : "#FCEDEC", color: dark ? "#FF6B5E" : "#B4372C" }}
          >
            <Trash2 size={18} />
          </span>
          <div className="min-w-0">
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>{title}</p>
            {subtitle && <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "rgb(var(--c-charcoal-muted))" }}>{subtitle}</p>}
          </div>
        </div>
        <div className="flex" style={{ gap: 10, marginTop: 18 }}>
          <button
            onClick={onCancel}
            className="tap flex-1"
            style={{ height: 44, borderRadius: 12, background: "rgb(var(--c-cream-card))", border: `1px solid ${dark ? "rgba(238,239,242,0.10)" : "#E4E4E9"}`, color: "rgb(var(--c-charcoal))", fontSize: 14, fontWeight: 700 }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="tap flex-1 disabled:opacity-60"
            style={{ height: 44, borderRadius: 12, background: "#C0392B", color: "#FFFFFF", fontSize: 14, fontWeight: 700 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
