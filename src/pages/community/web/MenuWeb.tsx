import React, { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { useWebDismiss } from "../../../components/dashboard/web/useWebDismiss";

export interface MenuWebOption<V extends string> {
  value: V;
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  /** A secondary line under the label (13/20 #8C8378). */
  note?: string;
}

/** Where the card opens: under an element (6 below, its start edge), or at a pointer (a right-click). */
export type MenuWebAt = { anchor: HTMLElement } | { x: number; y: number; anchor: HTMLElement };

const W = 210;
const EDGE = 8;

/**
 * Website viewport v1, the Community's anchored dropdown (WC-CO Community Web
 * v3, the Report / Block menu, literal): a 210 white card, r14, 0.5px
 * rgba(36,31,27,0.12), shadow 0 12px 32px rgba(36,31,27,0.16), padding 8;
 * rows 44, r8, padding 0 10, gap 10, the icon 16 and the label 15 in
 * #241F1B (the destructive row #B4372C), hover #F5F5F6. It opens 6 under its
 * trigger (upward when fewer than 220px are left below) or at the pointer for
 * a right-click; Escape and a click outside close it and focus returns to the
 * trigger; arrow keys move between rows.
 */
export function MenuWeb<V extends string>({
  at,
  options,
  selected,
  onSelect,
  onClose,
  label,
}: {
  at: MenuWebAt | null;
  options: MenuWebOption<V>[];
  selected?: V | null;
  onSelect: (v: V) => void;
  onClose: () => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const open = !!at;
  useWebDismiss(open, onClose, ref);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!at || !el) return;
    // Placed before paint, straight on the element (no second render).
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rtl = document.documentElement.dir === "rtl";
    let left: number;
    let top: number;
    if ("x" in at) {
      left = rtl ? at.x - W : at.x;
      top = at.y;
      if (top + h > vh - EDGE) top = Math.max(EDGE, at.y - h);
    } else {
      const r = at.anchor.getBoundingClientRect();
      left = rtl ? r.left : r.right - W;
      top = vh - r.bottom < 220 ? r.top - 6 - h : r.bottom + 6;
    }
    el.style.left = `${Math.min(Math.max(EDGE, left), vw - W - EDGE)}px`;
    el.style.top = `${Math.max(EDGE, top)}px`;
  }, [at]);

  if (!at) return null;
  const rows = () => Array.from(ref.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']:not(:disabled)") ?? []);
  return createPortal(
    <>
      <div aria-hidden className="fixed inset-0" style={{ zIndex: 59 }} onPointerDown={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        ref={ref}
        role="menu"
        aria-label={label}
        tabIndex={-1}
        data-co-menu
        onKeyDown={(e) => {
          if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
          e.preventDefault();
          const list = rows();
          const i = list.indexOf(document.activeElement as HTMLButtonElement);
          const next = e.key === "ArrowDown" ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
          list[next]?.focus();
        }}
        className="fixed outline-none"
        style={{
          zIndex: 60,
          width: W,
          boxSizing: "border-box",
          background: "#FFFFFF",
          borderRadius: 14,
          border: "0.5px solid rgba(36,31,27,0.12)",
          boxShadow: "0 12px 32px rgba(36,31,27,0.16)",
          padding: 8,
        }}
      >
        {options.map((o) => {
          const ink = o.destructive ? "#B4372C" : "#241F1B";
          const on = selected === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="menuitem"
              disabled={o.disabled}
              onClick={() => {
                onClose();
                onSelect(o.value);
              }}
              className="co-web-menu-row flex items-center w-full text-start"
              style={{ minHeight: 44, gap: 10, padding: "0 10px", borderRadius: 8, color: ink, opacity: o.disabled ? 0.5 : 1, background: on ? "#F0EDF9" : undefined }}
            >
              {o.icon && <span className="flex shrink-0" style={{ color: ink }}>{o.icon}</span>}
              <span className="flex flex-col min-w-0" style={{ flex: 1, padding: o.note ? "4px 0" : undefined }}>
                <span className="truncate" title={o.label} style={{ fontSize: 15, lineHeight: "24px", color: ink }}>{o.label}</span>
                {o.note && <span style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{o.note}</span>}
              </span>
              {on && <Check size={16} strokeWidth={2.6} color="#7D6BB5" className="shrink-0" aria-hidden />}
            </button>
          );
        })}
      </div>
    </>,
    document.body
  );
}
