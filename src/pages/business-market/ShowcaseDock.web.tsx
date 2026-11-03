import React from "react";
import { X } from "lucide-react";
import { t } from "../../i18n/core";

// Website viewport v1 · WB-MA.2 Showcase (WB-MA Marketplace Web v2,
// `isShowcase`): the docked "Edit item" beside the items list (grid span 5).
// ProductEditorSheet's showcase variant draws into this frame instead of its
// MasterSheet when it is docked: #F0EEFD with a 1px #7248F8 edge, radius 24;
// the 53 title bar (padding 0 18: the share button at the start, the title
// 20/26 800 #7248F8 centred, the 26 close ring 1.6px #7248F8 with a 12 X at
// the end); the white body (radius 22 22 0 0, padding 16 20, gap 10, spread
// over the height) and the footer under a 1px #F2F2F2 rule (padding 12 20 16)
// holding Save. Escape inside the panel closes it, as a sheet's would.

const DOCK_INK = "#7248F8";

export function DockedSheet({
  open,
  onClose,
  title,
  children,
  footer,
  headerAction,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <section
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key !== "Escape" || e.defaultPrevented) return;
        e.preventDefault();
        onClose();
      }}
      data-dock="showcase"
      style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", boxSizing: "border-box", background: "#F0EEFD", border: `1px solid ${DOCK_INK}`, borderRadius: 24, overflow: "hidden" }}
    >
      <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", height: 53, padding: "0 18px", gap: 8 }}>
        <span style={{ width: 34, display: "flex", justifyContent: "flex-start" }}>{headerAction}</span>
        <h2 style={{ flex: 1, minWidth: 0, margin: 0, textAlign: "center", color: DOCK_INK, fontSize: 20, lineHeight: "26px", fontWeight: 800 }}>{title}</h2>
        <span style={{ width: 34, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close")}
            title={t("Close")}
            className="market-focus"
            style={{ width: 26, height: 26, borderRadius: 999, display: "grid", placeItems: "center", boxSizing: "border-box", border: `1.6px solid ${DOCK_INK}`, background: "transparent", color: DOCK_INK, padding: 0, cursor: "pointer" }}
          >
            <X size={12} strokeWidth={2.6} aria-hidden />
          </button>
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0, background: "#FFFFFF", borderRadius: "22px 22px 0 0", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column" }}>{children}</div>
        {footer ? <div style={{ flex: "none", borderTop: "1px solid #F2F2F2", padding: "12px 20px 16px" }}>{footer}</div> : null}
      </div>
    </section>
  );
}

/** The docked editor's grey field box: #F2F3F5 radius 14, padding 10 14; label 13/20 500 #575863, 6 above the field. */
export function DockBox({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#F2F3F5", borderRadius: 14, padding: "10px 14px" }}>
      <label htmlFor={htmlFor} style={{ display: "block", margin: "0 0 6px", fontSize: 13, lineHeight: "20px", fontWeight: 500, color: "#575863" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
