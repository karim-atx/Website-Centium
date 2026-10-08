import React, { useEffect, useRef } from "react";
import { useIsDark } from "../../hooks/useIsDark";
import { linePx, textPx } from "../../theme/textSize";

export interface SegmentedTabItem {
  key: string;
  label: string;
  /** Flex-weight so the track's tabs fill it exactly, per the mobile
   *  handoff's own literal weights (e.g. Food: 0.80 / 1.08 / 0.86). Defaults
   *  to 1 (equal share) when a specific weight isn't given in the handoff. */
  weight?: number;
  /** An icon before the label (MO1.2's List / Map). */
  icon?: React.ReactNode;
}

/** The mobile handoff's segmented tab bar (item 7), replacing every pill-tab
 *  row on Food, Workout and any other iteration screen. Track `#F3F3FD`
 *  radius 16px padding 6px gap 5px; each tab 44px tall, radius 12px, padding
 *  `0 6px`, `min-width: 0`; active `#A79AD5` with `#FFFFFF` 12.5px/700; idle
 *  `#F5F4FE` with `#6D50D3` (Food) — Workout's frame (CentiumTabFrame
 *  `tabsWorkout`) sets its idle label in `#5B5349`, hence `idleInk`.
 *  Labels only, no icons.
 *
 *  `size="compact"` is the mobile v5.1 handover's detail-page height
 *  (Foundations 2.5: 38 pt tabs "on gym and class pages", so a 50 pt track).
 *  The default stays 44, so every existing tab bar is unchanged.
 *
 *  Mobile v5.1 R3, dark mode (no light islands): the track is tabs.container
 *  (#242730 on the card), an idle tab primary.tint.2 (#2B2C3A) and its label
 *  tabs.inactive.text (#B7ABDE, 6.5:1). `idleInk` is the LIGHT label only, so
 *  a caller's light-only ink (Workout's #5B5349) never reaches dark mode;
 *  `idleInkDark` overrides the dark label if a caller ever needs to.
 *
 *  `scroll` (MO1.1.2 Journal folders): the user's own folders, any number of
 *  them, so tabs keep their natural width (at least 86, the frame's) and the
 *  track scrolls sideways instead of squeezing labels. `light` overrides the
 *  four LIGHT-mode colours, for a row that replaced an older control and
 *  keeps its colours (decision 15); dark mode is unaffected. */
export const SegmentedTabs: React.FC<{
  items: SegmentedTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
  idleInk?: string;
  idleInkDark?: string;
  size?: "default" | "compact";
  scroll?: boolean;
  light?: { activeFill: string; activeInk: string; idleFill: string; idleInk: string };
  /** Track overrides, e.g. MO1.1.3's strip that runs off the right edge (radius 16 0 0 16). */
  trackStyle?: React.CSSProperties;
  /** Long labels wrap onto two centred lines (MO1.1.4's "Simple Deep Breathing"). */
  wrapLabels?: boolean;
  /** Label size when a frame draws other than 12.5 (MO1.2: 15 on List / Map, 12 on the category rail). */
  labelSize?: number;
  /** Tab height when a frame draws other than 44 / 38 (MO1.2's category rail: 32 in a 40 track). */
  tabHeight?: number;
  /** Idle label weight when a frame draws other than 700 (MO1.2's rail and MO1.2.1.3.1's shared tabs: 600). */
  idleWeight?: number;
  /** A scrolling track's tab padding and minimum width when a frame draws other than `0 16px` / 86
   *  (MO1.2's rail: natural width, 14 each side, so "All" is 43). */
  scrollTabPadding?: string;
  scrollMinWidth?: number;
  /** Tab radius when a frame draws other than 12 (Foundations' FO3 sub-tabs: 9). */
  tabRadius?: number;
  /**
   * The DARK colours of the main tab bar. "default" keeps the v5.1 set (track
   * #242730, idle #2B2C3A with #B7ABDE). "partB" is the v6 Part B main tabs
   * (FO1 #3-#5, WO1 #3-#5): track and idle tab #303141, idle label #B8B3C7.
   * Light mode is unaffected.
   */
  darkTone?: "default" | "partB";
  /**
   * "teal" is the FO3-style sub-tab row (WO1.3 #67-#69, MO1.7 #10-#12): track
   * #F4F3F9 (dark #242730, V6-93) r12 pad 4 gap 4; tabs 32 tall, r9, padding
   * 0 12, 12 / 18; active the theme secondary fill #79A8A1 with white 700
   * (dark: the fill-prep dark #4F7F78), idle transparent with #5B5349 /
   * #B8B3C7 600. The size props above still override it.
   */
  variant?: "default" | "teal";
}> = ({
  items,
  activeKey,
  onChange,
  className,
  idleInk = "rgb(var(--th-6d50d3))",
  idleInkDark = "rgb(var(--th-b7abde))",
  size = "default",
  scroll,
  light,
  trackStyle,
  wrapLabels,
  labelSize,
  tabHeight,
  idleWeight,
  scrollTabPadding,
  scrollMinWidth = 86,
  tabRadius,
  darkTone = "default",
  variant = "default",
}) => {
  const dark = useIsDark();
  const lit = dark ? undefined : light;
  const teal = variant === "teal";
  const partB = darkTone === "partB";
  const trackRef = useRef<HTMLDivElement | null>(null);
  // A scrolling track brings the active tab into view (a new folder, or one
  // just moved, can sit past the right edge).
  useEffect(() => {
    if (!scroll) return;
    const track = trackRef.current;
    const tab = track?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!track || !tab) return;
    const left = tab.offsetLeft - track.offsetLeft;
    if (left < track.scrollLeft) track.scrollTo({ left: left - 6, behavior: "smooth" });
    else if (left + tab.offsetWidth > track.scrollLeft + track.clientWidth)
      track.scrollTo({ left: left + tab.offsetWidth - track.clientWidth + 6, behavior: "smooth" });
  }, [scroll, activeKey, items.length]);

  // Track: fill.segmentedTrack #F3F3FD (dark #242730, V6-93); the Part B main
  // tabs draw #303141 in dark; the teal sub-tabs #F4F3F9.
  const trackFill = teal
    ? dark ? "rgb(var(--c-seg-track))" : "rgb(var(--th-f4f3f9))"
    : dark && partB ? "rgb(var(--th-303141))" : "rgb(var(--c-seg-track))";
  // Active: fill.segmentedActive #A79AD5 with white (V6-01; #5B48B8 under High
  // contrast; dark the primary fill with #0D0B1A), or the teal secondary.
  const activeFill = teal ? "rgb(var(--c-fill-prep))" : "rgb(var(--c-seg-active))";
  const activeInk = teal ? "#FFFFFF" : "rgb(var(--c-on-primary-fill))";
  const idleFill = teal
    ? "transparent"
    : dark ? (partB ? "rgb(var(--th-303141))" : "rgb(var(--th-2b2c3a))") : "rgb(var(--th-f5f4fe))";
  const idleLabel = teal
    ? "rgb(var(--c-charcoal-soft))"
    : dark ? (partB ? "rgb(var(--c-charcoal-soft))" : idleInkDark) : idleInk;
  const height = tabHeight ?? (teal ? 32 : size === "compact" ? 38 : 44);
  const radius = tabRadius ?? (teal ? 9 : 12);
  const pad = scroll ? scrollTabPadding ?? (teal ? "0 12px" : "0 16px") : teal ? "0 12px" : "0 6px";

  return (
    <div
      ref={trackRef}
      className={`flex items-center ${scroll ? "overflow-x-auto no-scrollbar" : ""} ${className ?? ""}`}
      style={{
        background: trackFill,
        ...(teal ? { borderRadius: 12, padding: 4, gap: 4 } : { borderRadius: 16, padding: 6, gap: 5 }),
        ...trackStyle,
      }}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <button
            key={item.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={`tap flex items-center justify-center ${wrapLabels ? "text-center leading-[1.15]" : "whitespace-nowrap"}`}
            style={{
              flex: scroll ? "none" : item.weight ?? 1,
              minWidth: scroll ? (teal && scrollMinWidth === 86 ? 0 : scrollMinWidth) : 0,
              height,
              gap: item.icon ? 6 : undefined,
              padding: pad,
              borderRadius: radius,
              background: lit ? (active ? lit.activeFill : lit.idleFill) : active ? activeFill : idleFill,
              color: lit ? (active ? lit.activeInk : lit.idleInk) : active ? activeInk : idleLabel,
              fontSize: textPx(labelSize ?? (teal ? 12 : 12.5)),
              ...(teal ? { lineHeight: linePx(18) } : null),
              fontWeight: active ? 700 : idleWeight ?? (teal ? 600 : 700),
            }}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
