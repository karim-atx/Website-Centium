import React, { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx } from "../../theme/textSize";

export interface PopupMenuOption<V extends string = string> {
  value: V;
  label: string;
  /** Optional leading icon (a Lucide icon element, ~15px). */
  icon?: React.ReactNode;
  /** Destructive option: text in rgb(192,57,43). */
  destructive?: boolean;
  disabled?: boolean;
  /** A short line under the label, e.g. why a disabled option is unavailable. */
  note?: string;
  /** Optional right-hand detail, e.g. the current rest time (WO8 exercise menu). */
  trailing?: React.ReactNode;
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
  /**
   * How the selected row reads. "tint" is the Nutrient Summary filter (02);
   * "filled" is the WO8 set-type dropdown frame: a filled row with bold text
   * and check (primary-fill and its ink; the frame's #A092E0 failed 4.5:1).
   * "plain" is MO1.3.2.1's category menu: borderless 40 pt rows at 14px,
   * radius 10, padding 0 10, gap 10, on a card with padding 6; the selected
   * row is primary.tint with deep bold text and a Check 15/2.4.
   */
  variant?: "tint" | "filled" | "plain";
  /**
   * Dim the page behind the card (default true). MO1.3.2.1 opens over an
   * already-dimmed sheet and leaves it undimmed; tap outside still closes.
   */
  backdrop?: boolean;
}

/**
 * Mobile v5.1 R3, dark mode (no light islands): the colours that are not a
 * token, as [light, dark]. The selected row is primary.tint (#303141 on the
 * card) bordered in primary.accent, its check primary.deep; destructive text
 * is danger dark. The card, rows, borders and inks use the cream / charcoal /
 * surface-raised / border-option tokens, whose light values are the literals.
 */
const MENU_COLORS = {
  onFill: ["rgb(var(--th-f0edf9))", "rgb(var(--th-303141))"],
  onBorder: ["rgb(var(--th-aea1dc))", "rgb(var(--th-9a8cd6))"],
  check: ["rgb(var(--th-7d6bb5))", "rgb(var(--th-b7abde))"],
  plainOn: ["rgb(var(--th-5f5093))", "rgb(var(--th-b7abde))"],
  destructive: ["rgb(192,57,43)", "#FF6B5E"],
} as const;

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
  variant = "tint",
  backdrop = true,
}: PopupMenuProps<V>) {
  const dark = useIsDark();
  const c = (key: keyof typeof MENU_COLORS) => MENU_COLORS[key][dark ? 1 : 0];
  const plain = variant === "plain";
  const pad = plain ? 6 : 8;
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; maxHeight: number; up: boolean } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const cardW = width + 2 * pad + 2; // content + padding + border
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
  }, [open, anchor, width, align, pad]);

  if (!open || !pos) return null;

  const isOn = (v: V) => (Array.isArray(selected) ? selected.includes(v) : selected === v);

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 60 }}>
      <style>{`@keyframes popup-menu-in { 0% { opacity: 0; transform: translateY(var(--pm-dy)) scale(0.96); } 100% { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
      <div
        className="absolute inset-0"
        onClick={onClose}
        style={backdrop ? { background: "rgba(36,31,27,0.18)", animation: "fade-in .2s ease both" } : { background: "transparent" }}
      />
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
            background: "rgb(var(--c-cream-card))",
            border: "1px solid rgb(var(--th-aea1dc) / 0.5)",
            borderRadius: 14,
            boxShadow: "0 12px 32px rgb(var(--th-5f5093) / 0.18)",
            padding: pad,
            animation: "popup-menu-in .22s cubic-bezier(.22,1,.36,1) both",
            transformOrigin: `${pos.up ? "bottom" : "top"} ${align}`,
            ["--pm-dy" as string]: pos.up ? "6px" : "-6px",
          } as React.CSSProperties
        }
      >
        {heading && (
          <p style={{ margin: "2px 4px 8px", fontSize: textPx(11), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgb(var(--c-charcoal-muted))" }}>
            {heading}
          </p>
        )}
        {options.map((opt, i) => {
          const on = isOn(opt.value);
          const filled = on && variant === "filled";
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
              style={
                plain
                  ? {
                      gap: 10,
                      borderRadius: 10,
                      padding: "0 10px",
                      minHeight: 40,
                      border: "none",
                      background: on ? c("onFill") : "transparent",
                      color: opt.destructive ? c("destructive") : on ? c("plainOn") : "rgb(var(--c-charcoal))",
                      fontSize: textPx(14),
                      fontWeight: on ? 700 : 500,
                    }
                  : {
                      gap: 9,
                      borderRadius: 8,
                      padding: "9px 10px",
                      marginTop: i > 0 ? 6 : 0,
                      // The filled selection: the board's #A092E0 in light, primary-fill in dark.
                      border: `1px solid ${filled ? "rgb(var(--c-fill-chip))" : on ? c("onBorder") : "rgb(var(--c-border-option))"}`,
                      background: filled ? "rgb(var(--c-fill-chip))" : on ? c("onFill") : "rgb(var(--c-surface-raised))",
                      color: filled ? "rgb(var(--c-on-primary-fill))" : opt.destructive ? c("destructive") : "rgb(var(--c-charcoal))",
                      fontSize: textPx(12.5),
                      fontWeight: on ? 700 : 500,
                    }
              }
            >
              {opt.icon && <span className="flex-none flex">{opt.icon}</span>}
              <span className="flex-1 min-w-0">
                {opt.label}
                {opt.note && (
                  <span className="block" style={{ fontSize: textPx(10.5), fontWeight: 500, marginTop: 1, color: "rgb(var(--c-charcoal-muted))" }}>
                    {opt.note}
                  </span>
                )}
              </span>
              {opt.trailing && <span className="flex-none">{opt.trailing}</span>}
              {on &&
                (plain ? (
                  <Check size={15} strokeWidth={2.4} className="flex-none" style={{ display: "block", color: c("plainOn") }} />
                ) : (
                  <Check size={13} strokeWidth={3} className="flex-none" style={{ display: "block", color: filled ? "rgb(var(--c-on-primary-fill))" : c("check") }} />
                ))}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
