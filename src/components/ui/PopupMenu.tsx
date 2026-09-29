import React, { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

export interface PopupMenuOption<V extends string = string> {
  value: V;
  label: string;
  /** Optional leading icon (a Lucide icon element, ~15px). */
  icon?: React.ReactNode;
  /** Destructive option: text in rgb(192,57,43). */
  destructive?: boolean;
  disabled?: boolean;
}

interface PopupMenuProps<V extends string> {
  open: boolean;
  onClose: () => void;
  /** The element the card anchors to (the ⋮, filter or sort button). */
  anchor: HTMLElement | null;
  options: PopupMenuOption<V>[];
  /** Selected value(s): a single value for pick-one menus, an array for multi-select. */
  selected?: V | V[] | null;
  onSelect: (value: V) => void;
  /**
   * Multi-select keeps the card open on each tap (e.g. WO11 Discipline);
   * otherwise picking an option closes it.
   */
  multiSelect?: boolean;
  /** Card content width in px (the card adds 8px padding each side). */
  width?: number;
  /** Which trigger edge the card lines up with. */
  align?: "left" | "right";
  /** Optional caption row above the options. */
  heading?: string;
}

const GAP = 6; // between trigger and card
const EDGE = 8; // min distance from the viewport edges

/**
 * The shared popup / dropdown, handover 2026-09-29 02 "Popup / dropdown
 * (Nutrient Summary filter style)": a floating white card anchored to its
 * trigger — border rgba(174,161,220,0.5), radius 14, shadow
 * 0 12px 32px rgba(95,80,147,0.18), padding 8. Options are rows: radius 8,
 * border #E5E6EB, fill #FAFAFB, 12.5px; selected = fill #F0EDF9, border
 * #AEA1DC, bold, check #7D6BB5. Destructive option text rgb(192,57,43). Tap
 * outside closes. Long lists scroll inside.
 *
 * Used by row / folder ⋮ menus, sort, goal selector, dietary restriction,
 * discipline filter and the Nutrient Summary filter.
 */
export function PopupMenu<V extends string>({
  open,
  onClose,
  anchor,
  options,
  selected,
  onSelect,
  multiSelect,
  width = 168,
  align = "right",
  heading,
}: PopupMenuProps<V>) {
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; maxHeight: number; up: boolean } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const cardW = width + 16 + 2; // content + padding + border
      let left = align === "right" ? r.right - cardW : r.left;
      left = Math.min(Math.max(EDGE, left), vw - cardW - EDGE);
      const below = vh - r.bottom - GAP - EDGE;
      const above = r.top - GAP - EDGE;
      // Opens downward unless the space below is short and there is more
      // above (FO6 opens upward from the Plan card near the bottom).
      const up = below < 220 && above > below;
      setPos(
        up
          ? { bottom: vh - r.top + GAP, left, maxHeight: above, up }
          : { top: r.bottom + GAP, left, maxHeight: below, up }
      );
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor, width, align]);

  if (!open || !pos) return null;

  const isOn = (v: V) => (Array.isArray(selected) ? selected.includes(v) : selected === v);

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 60 }}>
      <style>{`@keyframes popup-menu-in { 0% { opacity: 0; transform: translateY(var(--pm-dy)) scale(0.96); } 100% { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
      <div className="absolute inset-0" onClick={onClose} style={{ background: "rgba(36,31,27,0.18)", animation: "fade-in .2s ease both" }} />
      <div
        role="menu"
        className="absolute overflow-y-auto overscroll-contain"
        style={
          {
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            width,
            maxHeight: pos.maxHeight,
            boxSizing: "content-box",
            background: "#FFFFFF",
            border: "1px solid rgba(174,161,220,0.5)",
            borderRadius: 14,
            boxShadow: "0 12px 32px rgba(95,80,147,0.18)",
            padding: 8,
            animation: "popup-menu-in .22s cubic-bezier(.22,1,.36,1) both",
            transformOrigin: `${pos.up ? "bottom" : "top"} ${align}`,
            ["--pm-dy" as string]: pos.up ? "6px" : "-6px",
          } as React.CSSProperties
        }
      >
        {heading && (
          <p style={{ margin: "2px 4px 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8C8378" }}>
            {heading}
          </p>
        )}
        {options.map((opt, i) => {
          const on = isOn(opt.value);
          return (
            <button
              key={opt.value}
              role={multiSelect ? "menuitemcheckbox" : selected !== undefined ? "menuitemradio" : "menuitem"}
              aria-checked={selected !== undefined ? on : undefined}
              disabled={opt.disabled}
              onClick={() => {
                onSelect(opt.value);
                if (!multiSelect) onClose();
              }}
              className="tap w-full flex items-center text-left disabled:opacity-40"
              style={{
                gap: 9,
                borderRadius: 8,
                padding: "9px 10px",
                marginTop: i > 0 ? 6 : 0,
                border: `1px solid ${on ? "#AEA1DC" : "#E5E6EB"}`,
                background: on ? "#F0EDF9" : "#FAFAFB",
                color: opt.destructive ? "rgb(192,57,43)" : "#241F1B",
                fontSize: 12.5,
                fontWeight: on ? 700 : 500,
              }}
            >
              {opt.icon && <span className="flex-none flex">{opt.icon}</span>}
              <span className="flex-1 min-w-0">{opt.label}</span>
              {on && <Check size={13} strokeWidth={3} className="flex-none" style={{ display: "block", color: "#7D6BB5" }} />}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
