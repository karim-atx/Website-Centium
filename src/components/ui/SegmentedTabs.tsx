import React from "react";

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
 *  radius 16px padding 6px gap 5px; each tab 44px tall, radius 12px; active
 *  `#A79AD5` with `#FFFFFF` 12.5px/700; idle `#F5F4FE` with `#6D50D3`.
 *  Labels only, no icons. */
export const SegmentedTabs: React.FC<{
  items: SegmentedTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}> = ({ items, activeKey, onChange, className }) => (
  <div
    className={`flex ${className ?? ""}`}
    style={{ background: "#F3F3FD", borderRadius: 16, padding: 6, gap: 5 }}
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
            height: 44,
            borderRadius: 12,
            background: active ? "#A79AD5" : "#F5F4FE",
            color: active ? "#FFFFFF" : "#6D50D3",
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
