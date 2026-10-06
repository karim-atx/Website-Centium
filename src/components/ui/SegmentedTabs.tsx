import React, { useEffect, useRef } from "react";
import { useIsDark } from "../../hooks/useIsDark";

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
}> = ({ items, activeKey, onChange, className, idleInk = "rgb(var(--th-6d50d3))", idleInkDark = "rgb(var(--th-b7abde))", size = "default", scroll, light, trackStyle, wrapLabels, labelSize = 12.5, tabHeight }) => {
  const dark = useIsDark();
  const lit = dark ? undefined : light;
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
  return (
    <div
      ref={trackRef}
      className={`flex items-center ${scroll ? "overflow-x-auto no-scrollbar" : ""} ${className ?? ""}`}
      style={{ background: dark ? "#242730" : "rgb(var(--th-f3f3fd))", borderRadius: 16, padding: 6, gap: 5, ...trackStyle }}
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
              minWidth: scroll ? 86 : 0,
              height: tabHeight ?? (size === "compact" ? 38 : 44),
              gap: item.icon ? 6 : undefined,
              padding: scroll ? "0 16px" : "0 6px",
              borderRadius: 12,
              background: lit
                ? active ? lit.activeFill : lit.idleFill
                : active ? (dark ? "rgb(var(--c-primary-fill))" : "rgb(var(--th-a79ad5))") : dark ? "rgb(var(--th-2b2c3a))" : "rgb(var(--th-f5f4fe))",
              color: lit
                ? active ? lit.activeInk : lit.idleInk
                : active ? "rgb(var(--c-on-primary-fill))" : dark ? idleInkDark : idleInk,
              fontSize: labelSize,
              fontWeight: 700,
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
