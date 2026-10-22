import React, { useRef } from "react";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx, linePx } from "../../theme/textSize";
import { NO_ICON_SCALE } from "../pro/proInk";
import { SEGMENT_STEPS, marketPalette } from "../../theme/marketTokens";
import { hexAlpha } from "./marketColor";

// Market + Share 3.0 · SegmentedTicketStrip (HANDOVER §5: items 2–4, active,
// step colours 1–4; tokens.json segmentSteps, divider 1.5px dashed
// rgba(36,31,27,0.16), active text #FFFFFF, idle text #17142A). Two drawings:
// - "tab" (C-MO.4.9 profile tabs, Client Professional line 67; P-MA.2
//   Showcase, Professional Marketplace line 115): a flex row, radius 16,
//   overflow hidden; each item flex 1, 44 tall, 12 / 700 nowrap; active = the
//   step's ink as the fill with white text, idle = the step's tint with
//   #17142A; items after the first carry the dashed divider on the left.
// - "tile" (C-MO.4.4.1 Shop · Location · Online, Client Explore line 409): a
//   grid of equal columns, radius 16, each 78 tall, column, gap 6, a 20 icon
//   (stroke 1.9; the step ink when idle, white when active) over a 14 / 18 600
//   label; four 14 notches at the outer corners (−7) in the surface colour.
// Each item names its own step (Showcase uses steps 1, 2, 4); by default item
// i takes step i + 1. Dark (D-05): the active fill keeps the step ink; the
// idle tint becomes the ink at 16% on the dark card and the text the app's
// ink.

export interface TicketStripItem<K extends string = string> {
  key: K;
  label: string;
  /** 1 to 4; defaults to the item's position + 1. */
  step?: 1 | 2 | 3 | 4;
  /** A 20 px icon for the tile drawing (a lucide icon component). */
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string; style?: React.CSSProperties; "aria-hidden"?: boolean }>;
}

export interface SegmentedTicketStripProps<K extends string> {
  items: TicketStripItem<K>[];
  active: K;
  onChange: (key: K) => void;
  variant?: "tab" | "tile";
  /** The surface behind the strip, for the tile notches. Defaults to --page. */
  notchBg?: string;
  /** Accessible name of the group. */
  label?: string;
  /** Tab semantics (role tablist / tab) for page tabs; buttons with aria-pressed otherwise. Default true for "tab". */
  tabs?: boolean;
  /** The id prefix tying tabs to their panels (aria-controls `${idPrefix}-panel-${key}`). */
  idPrefix?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const DIVIDER = "1.5px dashed rgba(36,31,27,0.16)";
const DIVIDER_DARK = "1.5px dashed rgba(245,243,250,0.16)";

export function SegmentedTicketStrip<K extends string>({
  items,
  active,
  onChange,
  variant = "tab",
  notchBg,
  label,
  tabs,
  idPrefix,
  className,
  style,
}: SegmentedTicketStripProps<K>) {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const asTabs = tabs ?? variant === "tab";
  const tile = variant === "tile";

  // Arrow keys move between items (tabs pattern, roving focus).
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = items.length;
    let j = -1;
    if (e.key === "ArrowRight") j = (i + 1) % n;
    else if (e.key === "ArrowLeft") j = (i - 1 + n) % n;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = n - 1;
    if (j < 0) return;
    e.preventDefault();
    onChange(items[j].key);
    refs.current[j]?.focus();
  };

  const notch: React.CSSProperties = { position: "absolute", width: 14, height: 14, borderRadius: 999, background: notchBg ?? m.page, pointerEvents: "none" };

  return (
    <div
      role={asTabs ? "tablist" : "group"}
      aria-label={label}
      className={className}
      style={{
        position: "relative",
        lineHeight: "normal",
        display: tile ? "grid" : "flex",
        ...(tile ? { gridTemplateColumns: `repeat(${items.length},minmax(0,1fr))` } : null),
        borderRadius: 16,
        overflow: "hidden",
        ...style,
      }}
    >
      {items.map((it, i) => {
        const on = it.key === active;
        const [tint, ink] = SEGMENT_STEPS[(it.step ?? ((i % 4) + 1)) - 1];
        const idleBg = dark ? hexAlpha(ink, 0.16) : tint;
        const idleInk = dark ? m.ink : "#17142A";
        const Icon = it.icon;
        return (
          <button
            key={it.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role={asTabs ? "tab" : undefined}
            aria-selected={asTabs ? on : undefined}
            aria-pressed={asTabs ? undefined : on}
            aria-controls={asTabs && idPrefix ? `${idPrefix}-panel-${it.key}` : undefined}
            id={idPrefix ? `${idPrefix}-tab-${it.key}` : undefined}
            tabIndex={asTabs ? (on ? 0 : -1) : undefined}
            onClick={() => onChange(it.key)}
            onKeyDown={(e) => onKey(e, i)}
            style={{
              margin: 0,
              padding: 0,
              border: 0,
              borderLeft: i ? (dark ? DIVIDER_DARK : DIVIDER) : 0,
              font: "inherit",
              cursor: "pointer",
              background: on ? ink : idleBg,
              color: on ? "#FFFFFF" : idleInk,
              ...(tile
                ? { height: 78, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }
                : { flex: 1, minWidth: 0, height: 44, display: "flex", alignItems: "center", justifyContent: "center", fontSize: textPx(12), fontWeight: 700, whiteSpace: "nowrap" }),
            }}
          >
            {tile ? (
              <>
                {Icon ? (
                  <span style={{ display: "flex" }}>
                    <Icon size={20} strokeWidth={1.9} color={on ? "#FFFFFF" : dark ? m.ink : ink} aria-hidden style={{ display: "block", ...NO_ICON_SCALE }} />
                  </span>
                ) : null}
                <span style={{ fontSize: textPx(14), lineHeight: linePx(18), fontWeight: 600 }}>{it.label}</span>
              </>
            ) : (
              it.label
            )}
          </button>
        );
      })}
      {tile ? (
        <>
          <span aria-hidden style={{ ...notch, left: -7, top: -7 }} />
          <span aria-hidden style={{ ...notch, right: -7, top: -7 }} />
          <span aria-hidden style={{ ...notch, left: -7, bottom: -7 }} />
          <span aria-hidden style={{ ...notch, right: -7, bottom: -7 }} />
        </>
      ) : null}
    </div>
  );
}

