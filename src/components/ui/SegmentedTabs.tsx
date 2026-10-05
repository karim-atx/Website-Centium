import React from "react";
import { useIsDark } from "../../hooks/useIsDark";

export interface SegmentedTabItem {
  key: string;
  label: string;
  /** Flex-weight so the track's tabs fill it exactly, per the mobile
   *  handoff's own literal weights (e.g. Food: 0.80 / 1.08 / 0.86). Defaults
   *  to 1 (equal share) when a specific weight isn't given in the handoff. */
  weight?: number;
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
 *  `idleInkDark` overrides the dark label if a caller ever needs to. */
export const SegmentedTabs: React.FC<{
  items: SegmentedTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
  idleInk?: string;
  idleInkDark?: string;
  size?: "default" | "compact";
}> = ({ items, activeKey, onChange, className, idleInk = "#6D50D3", idleInkDark = "#B7ABDE", size = "default" }) => {
  const dark = useIsDark();
  return (
    <div
      className={`flex items-center ${className ?? ""}`}
      style={{ background: dark ? "#242730" : "#F3F3FD", borderRadius: 16, padding: 6, gap: 5 }}
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
            className="tap flex items-center justify-center whitespace-nowrap"
            style={{
              flex: item.weight ?? 1,
              minWidth: 0,
              height: size === "compact" ? 38 : 44,
              padding: "0 6px",
              borderRadius: 12,
              background: active ? "rgb(var(--c-primary-fill))" : dark ? "#2B2C3A" : "#F5F4FE",
              color: active ? "rgb(var(--c-on-primary-fill))" : dark ? idleInkDark : idleInk,
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
