import React, { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Minus, Plus, SquareCheck } from "lucide-react";
import { useIsDark } from "../../hooks/useIsDark";
import { linePx, textPx } from "../../theme/textSize";

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
  /**
   * Field menus (BU OP1-164, OP1-173): a group heading drawn above the first
   * option of each run with the same `group` (margin 10 4 2, 11/700 0.1em
   * uppercase, faint).
   */
  group?: string;
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
   * "field" is the v6 Business UI field dropdown (X-20, BU2 W4, OP1-158):
   * the "tint" card and rows with row gap 10, min-height 44, label 13/700 on
   * every row, notes 11/400, check 16/2.6 (#7D6BB5 / #C3B3FB; SquareCheck
   * when multi-select), selected border primary (#AEA1DC / #A991FE), and no
   * dim by default.
   */
  variant?: "tint" | "filled" | "plain" | "field" | "health";
  /**
   * Dim the page behind the card (default true; false for "field"). MO1.3.2.1 opens over an
   * already-dimmed sheet and leaves it undimmed; tap outside still closes.
   */
  backdrop?: boolean;
  /**
   * The backdrop's opacity over rgb(36,31,27) when a frame draws other than
   * Foundations' 0.18 (MO1.2.1.3.4's attach popup: 0.4). Unset leaves every
   * other menu as it is.
   */
  dim?: number;
  /**
   * The option notes' type when a frame draws other than 10.5/500 (MO1.2.1.3.4:
   * 11/400 on a 15 line). Unset leaves every other menu as it is.
   */
  noteType?: { size: number; weight: number; lineHeight?: number };
  /**
   * The space between the trigger and the card when a frame draws other than
   * 6 (MO1.2.1.3.4's attach popup: 8.5, measured). Unset leaves every other
   * menu as it is.
   */
  gap?: number;
  /**
   * The option label's line height in px when a frame draws other than the
   * inherited one (MO1.1.2.1: 16, so a bordered row is 36 tall, measured).
   * Unset leaves every other menu as it is.
   */
  rowLineHeight?: number;
  /**
   * v6 field menus (BU OP1-158, -161): the card takes this element's left edge
   * and width (the sheet's full field row, even for a half-width trigger)
   * instead of `width` / `align`.
   */
  matchWidth?: HTMLElement | null;
  /**
   * Keep the card inside this element (a sheet body) instead of the viewport:
   * it flips and clamps against the element's edges, 8 in (OP1-161 row 1).
   */
  clampTo?: HTMLElement | null;
  /**
   * A Done button under the options (OP1-161 row 5: margin-top 8, 40 tall,
   * r10, primary fill, 13/800). Done runs this, then closes.
   */
  onDone?: () => void;
  doneLabel?: string;
  /**
   * Keep the card open when a row is picked, without the multi-select
   * square check (OP1-164 Limit, OP1-173 Commitment: single choices per
   * group, closed by Done). Off by default.
   */
  keepOpen?: boolean;
  /**
   * v6 Part B menus (HE1.9.b #28-#31): 0.5px card and row borders, the card
   * border #AEA1DC@50% (dark #A991FE@50%), no card shadow in dark. Off by
   * default, so every other menu is unchanged.
   */
  hairline?: boolean;
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
  backdrop,
  dim = 0.18,
  noteType,
  gap = GAP,
  rowLineHeight,
  matchWidth,
  clampTo,
  onDone,
  doneLabel = "Done",
  keepOpen,
  hairline,
}: PopupMenuProps<V>) {
  const dark = useIsDark();
  const c = (key: keyof typeof MENU_COLORS) => MENU_COLORS[key][dark ? 1 : 0];
  // "health" (OURS-health-overflow-menus #1, the Health metric pages' ⋮):
  // white r16 + 0.5px #241F1B@8% (dark #1C1F28, #F5F3FA@8%; High contrast
  // 30% of ink), rows 44 tall pad 0 14, 14/19 600 charcoal, icons #7D6BB5
  // (dark #C3B3FB). Shadow: the app menu shadow (UNSPECIFIED there).
  const health = variant === "health";
  const plain = variant === "plain" || health;
  const field = variant === "field";
  const dimmed = backdrop ?? !field;
  const pad = plain ? 6 : 8;
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number; up: boolean } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      // The bounds: the viewport, or the element the card is kept inside.
      const box = clampTo?.getBoundingClientRect();
      const minX = (box ? Math.max(0, box.left) : 0) + EDGE;
      const maxX = (box ? Math.min(vw, box.right) : vw) - EDGE;
      const minY = (box ? Math.max(0, box.top) : 0) + EDGE;
      const maxY = (box ? Math.min(vh, box.bottom) : vh) - EDGE;
      const row = matchWidth?.getBoundingClientRect();
      // Content width: the matched row's outer width minus padding and border.
      const contentW = row ? Math.max(0, row.width - 2 * pad - 2) : width;
      const cardW = contentW + 2 * pad + 2; // content + padding + border
      let left = row ? row.left : align === "right" ? r.right - cardW : r.left;
      left = Math.min(Math.max(minX, left), maxX - cardW);
      const below = maxY - r.bottom - gap;
      const above = r.top - gap - minY;
      // Opens downward unless the space below is short and there is more
      // above (FO6 opens upward from the Plan card near the bottom).
      const up = below < 220 && above > below;
      setPos(
        up
          ? { bottom: vh - r.top + gap, left, width: contentW, maxHeight: above, up }
          : { top: r.bottom + gap, left, width: contentW, maxHeight: below, up }
      );
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor, width, align, pad, gap, matchWidth, clampTo]);

  if (!open || !pos) return null;

  const isOn = (v: V) => (Array.isArray(selected) ? selected.includes(v) : selected === v);
  const capsStyle: React.CSSProperties = {
    fontSize: textPx(11),
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "rgb(var(--c-charcoal-muted))",
  };
  const CheckGlyph = multiSelect ? SquareCheck : Check;

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 60 }}>
      {/* Business UI tokens.motion.menuIn: 220 ms easeBase, translateY 6 px
          (from the trigger's side), no scale. */}
      <style>{`@keyframes popup-menu-in { 0% { opacity: 0; transform: translateY(var(--pm-dy)); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
      <div
        className="absolute inset-0"
        onClick={onClose}
        style={dimmed ? { background: `rgba(36,31,27,${dim})`, animation: "fade-in .2s ease both" } : { background: "transparent" }}
      />
      <div
        role="menu"
        className="absolute overflow-y-auto overscroll-contain"
        style={
          {
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            width: pos.width,
            // content-box: the space on that side less the padding and border,
            // so a clamped card stops at the edge (OP1-161 row 1: 8 in).
            maxHeight: Math.max(0, pos.maxHeight - 2 * pad - 2),
            boxSizing: "content-box",
            background: "rgb(var(--c-cream-card))",
            border: health
              ? `0.5px solid ${document.documentElement.classList.contains("high-contrast") ? "rgb(var(--c-charcoal) / 0.3)" : dark ? "rgba(245,243,250,0.08)" : "rgba(36,31,27,0.08)"}`
              : hairline && dark ? "0.5px solid rgb(var(--c-primary) / 0.5)" : `${hairline ? 0.5 : 1}px solid rgb(var(--th-aea1dc) / 0.5)`,
            borderRadius: health ? 16 : 14,
            ...(health ? { background: dark ? "#1C1F28" : "#FFFFFF" } : null),
            boxShadow: hairline && dark ? "none" : "0 12px 32px rgb(var(--th-5f5093) / 0.18)",
            padding: pad,
            animation: "popup-menu-in .22s cubic-bezier(.22,1,.36,1) both",
            ["--pm-dy" as string]: pos.up ? "6px" : "-6px",
          } as React.CSSProperties
        }
      >
        {heading && <p style={{ margin: "2px 4px 8px", ...capsStyle }}>{heading}</p>}
        {options.map((opt, i) => {
          const on = isOn(opt.value);
          const filled = on && variant === "filled";
          const groupStart = !!opt.group && opt.group !== options[i - 1]?.group;
          const row = (
            <button
              key={opt.value}
              role={multiSelect ? "menuitemcheckbox" : selected !== undefined ? "menuitemradio" : "menuitem"}
              aria-checked={selected !== undefined ? on : undefined}
              disabled={opt.disabled}
              onClick={() => {
                onSelect(opt.value);
                if (!multiSelect && !keepOpen) onClose();
              }}
              className="tap w-full flex items-center text-left disabled:opacity-40"
              style={
                plain
                  ? {
                      gap: 10,
                      borderRadius: 10,
                      padding: health ? "0 14px" : "0 10px",
                      minHeight: health ? 44 : 40,
                      border: "none",
                      background: on ? c("onFill") : "transparent",
                      color: opt.destructive ? c("destructive") : on ? c("plainOn") : "rgb(var(--c-charcoal))",
                      fontSize: textPx(14),
                      fontWeight: on ? 700 : health ? 600 : 500,
                      ...(health ? { lineHeight: linePx(19) } : null),
                    }
                  : {
                      gap: field ? 10 : 9,
                      borderRadius: 8,
                      padding: "9px 10px",
                      marginTop: i > 0 && !groupStart ? 6 : 0,
                      ...(field ? { minHeight: 44 } : null),
                      // The filled selection: the board's #A092E0 in light, primary-fill in dark.
                      // Field: the selected border is primary (#AEA1DC / #A991FE, OP1-158 #8).
                      border: `${hairline ? 0.5 : 1}px solid ${
                        filled ? "rgb(var(--c-fill-chip))" : on ? (field ? "rgb(var(--c-primary))" : c("onBorder")) : "rgb(var(--c-border-option))"
                      }`,
                      background: filled ? "rgb(var(--c-fill-chip))" : on ? c("onFill") : "rgb(var(--c-surface-raised))",
                      color: filled ? "rgb(var(--c-on-primary-fill))" : opt.destructive ? c("destructive") : "rgb(var(--c-charcoal))",
                      fontSize: textPx(field ? 13 : 12.5),
                      fontWeight: field || on ? 700 : 500,
                      ...(rowLineHeight ? { lineHeight: linePx(rowLineHeight) } : {}),
                    }
              }
            >
              {opt.icon && <span className="flex-none flex" style={health ? { color: dark ? "rgb(var(--th-c3b3fb))" : document.documentElement.classList.contains("high-contrast") ? "#4B3BA0" : "rgb(var(--th-7d6bb5))" } : undefined}>{opt.icon}</span>}
              <span className="flex-1 min-w-0">
                {opt.label}
                {opt.note && (
                  <span
                    className="block"
                    style={{
                      fontSize: textPx(noteType?.size ?? (field ? 11 : 10.5)),
                      fontWeight: noteType?.weight ?? (field ? 400 : 500),
                      ...(noteType?.lineHeight ? { lineHeight: noteType.lineHeight } : {}),
                      marginTop: 1,
                      color: "rgb(var(--c-charcoal-muted))",
                    }}
                  >
                    {opt.note}
                  </span>
                )}
              </span>
              {opt.trailing && <span className="flex-none">{opt.trailing}</span>}
              {on &&
                (plain ? (
                  <Check size={15} strokeWidth={2.4} className="flex-none" style={{ display: "block", color: c("plainOn") }} />
                ) : field ? (
                  <CheckGlyph
                    size={16}
                    strokeWidth={2.6}
                    className="flex-none"
                    style={{ display: "block", color: dark ? "rgb(var(--th-c3b3fb))" : "rgb(var(--th-7d6bb5))" }}
                  />
                ) : (
                  <Check size={13} strokeWidth={3} className="flex-none" style={{ display: "block", color: filled ? "rgb(var(--c-on-primary-fill))" : c("check") }} />
                ))}
            </button>
          );
          return groupStart ? (
            <React.Fragment key={opt.value}>
              <p role="presentation" style={{ margin: i > 0 ? "16px 4px 2px" : "10px 4px 2px", ...capsStyle }}>
                {opt.group}
              </p>
              <div style={{ marginTop: 6 }}>{row}</div>
            </React.Fragment>
          ) : (
            row
          );
        })}
        {onDone && (
          <button
            type="button"
            onClick={() => {
              onDone();
              onClose();
            }}
            className="tap w-full flex items-center justify-center"
            style={{
              marginTop: 8,
              height: 40,
              borderRadius: 10,
              background: "rgb(var(--c-primary-fill))",
              color: "rgb(var(--c-on-primary-fill))",
              fontSize: textPx(13),
              fontWeight: 800,
            }}
          >
            {doneLabel}
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}

/**
 * The stepper a field-menu row carries on its right (OP1-164 row 5, "Up to
 * 12 classes"): minus and plus buttons 32 x 32, r10, 1px border (#E7E6E6 /
 * #2D3039) on the card fill, glyph 15 / 2.4 primary.deep (#7D6BB5 / #C3B3FB);
 * between them a value box min-width 30, 32 tall, r10, 1.5px primary border,
 * 14/800 tabular; gap 6. Each button's hit area grows 6 up and down and
 * shares the 6 gaps (OURS: the 38 pitch cannot hold 44-wide targets). Taps
 * never reach the row underneath. Pass it as an option's `trailing`.
 *
 * The trigger of an open field menu carries a 2px primary ring outside its
 * hairline (OP1-158 row 1): `boxShadow: "0 0 0 2px rgb(var(--c-primary))"`.
 */
export const MenuStepper: React.FC<{
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Accessible names (source: "Fewer" / "More"). */
  decreaseLabel?: string;
  increaseLabel?: string;
  /** Accessible name of the value. */
  label?: string;
  /** Both buttons disabled (the row's choice is not available yet). */
  disabled?: boolean;
}> = ({ value, onChange, min = 1, max = 99, decreaseLabel = "Fewer", increaseLabel = "More", label, disabled }) => {
  const dark = useIsDark();
  const glyph = dark ? "rgb(var(--th-c3b3fb))" : "rgb(var(--th-7d6bb5))";
  const btn: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 10,
    border: `1px solid ${dark ? "#2D3039" : "#E7E6E6"}`,
    background: "rgb(var(--c-cream-card))",
    color: glyph,
  };
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const hit = "relative flex items-center justify-center disabled:opacity-40 before:absolute before:content-[''] before:-inset-y-[6px] before:-inset-x-[3px]";
  return (
    <span className="flex items-center" style={{ gap: 6 }} onClick={stop} onPointerDown={stop}>
      <button type="button" aria-label={decreaseLabel} disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - 1))} className={hit} style={btn}>
        <Minus size={15} strokeWidth={2.4} aria-hidden />
      </button>
      <span
        role="spinbutton"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        className="flex items-center justify-center tabular-nums"
        style={{
          minWidth: 30,
          height: 32,
          borderRadius: 10,
          border: "1.5px solid rgb(var(--c-primary))",
          padding: "0 4px",
          fontSize: textPx(14),
          fontWeight: 800,
          color: "rgb(var(--c-charcoal))",
        }}
      >
        {value}
      </span>
      <button type="button" aria-label={increaseLabel} disabled={disabled || value >= max} onClick={() => onChange(Math.min(max, value + 1))} className={hit} style={btn}>
        <Plus size={15} strokeWidth={2.4} aria-hidden />
      </button>
    </span>
  );
};

