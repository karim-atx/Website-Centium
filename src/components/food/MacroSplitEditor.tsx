import React from "react";
import type { MacroSplit } from "../../types";

const macroMeta = [
  { key: "proteinPct" as const, label: "Protein", color: "#7D6BB5", kcalPerG: 4 },
  { key: "carbsPct" as const, label: "Carbs", color: "#D9A441", kcalPerG: 4 },
  { key: "fatPct" as const, label: "Fat", color: "#6F9993", kcalPerG: 9 },
];

interface Props {
  split: MacroSplit;
  calories: number;
  onChange: (split: MacroSplit) => void;
  disabled?: boolean;
}

/** Editing one slider proportionally rescales the other two so the three
 * always sum to 100% — mirrors how MyFitnessPal-style macro editors behave. */
export const MacroSplitEditor: React.FC<Props> = ({ split, calories, onChange, disabled }) => {
  const handleSlide = (key: keyof MacroSplit, value: number) => {
    const others = macroMeta.map((m) => m.key).filter((k) => k !== key) as (keyof MacroSplit)[];
    const remaining = 100 - value;
    const othersSum = split[others[0]] + split[others[1]];
    const next: MacroSplit = { ...split, [key]: value };
    if (othersSum === 0) {
      next[others[0]] = Math.round(remaining / 2);
      next[others[1]] = remaining - next[others[0]];
    } else {
      next[others[0]] = Math.round((split[others[0]] / othersSum) * remaining);
      next[others[1]] = remaining - next[others[0]];
    }
    onChange(next);
  };

  return (
    <div className={disabled ? "space-y-5 opacity-50 pointer-events-none" : "space-y-5"}>
      {macroMeta.map((m) => {
        const pct = split[m.key];
        const grams = Math.round((calories * (pct / 100)) / m.kcalPerG);
        return (
          <div key={m.key}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-sm font-semibold text-charcoal">{m.label}</span>
              <span className="text-xs text-charcoal-faint">
                {pct}% · {grams}g
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={70}
              value={pct}
              onChange={(e) => handleSlide(m.key, Number(e.target.value))}
              disabled={disabled}
              className="w-full accent-primary h-2"
              style={{ accentColor: m.color }}
            />
          </div>
        );
      })}
      <p className="text-xs text-charcoal-faint">
        Adjusting one macro rebalances the other two so they always total 100%.
      </p>
    </div>
  );
};
