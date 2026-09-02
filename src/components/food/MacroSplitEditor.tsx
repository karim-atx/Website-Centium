import React from "react";
import type { MacroSplit } from "../../types";

// QA 13.0: "adjusting the macro rebalancing should always adopt a scientific
// based approach and not just blindly rebalance to 100%." min/max per macro
// are the Acceptable Macronutrient Distribution Ranges (AMDR) from the
// Dietary Reference Intakes — the established evidence-based bounds for
// healthy adults — rather than the previous shared 5-70% for every macro.
const macroMeta = [
  { key: "proteinPct" as const, label: "Protein", color: "#7D6BB5", kcalPerG: 4, min: 10, max: 35 },
  { key: "carbsPct" as const, label: "Carbs", color: "#D9A441", kcalPerG: 4, min: 30, max: 65 },
  { key: "fatPct" as const, label: "Fat", color: "#6F9993", kcalPerG: 9, min: 20, max: 40 },
];

type MacroMeta = (typeof macroMeta)[number];

const clamp = (value: number, m: MacroMeta) => Math.min(m.max, Math.max(m.min, value));

interface Props {
  split: MacroSplit;
  calories: number;
  onChange: (split: MacroSplit) => void;
  disabled?: boolean;
}

/** Editing one slider rescales the other two proportionally to their current
 * ratio, then clamps both to their AMDR range so no macro can be dragged to
 * a scientifically unreasonable extreme just to make room for another. */
export const MacroSplitEditor: React.FC<Props> = ({ split, calories, onChange, disabled }) => {
  const handleSlide = (key: keyof MacroSplit, rawValue: number) => {
    const m = macroMeta.find((mm) => mm.key === key)!;
    const value = clamp(rawValue, m);
    const [o1, o2] = macroMeta.filter((mm) => mm.key !== key);
    const remaining = 100 - value;
    const othersSum = split[o1.key] + split[o2.key];
    const ratio = othersSum === 0 ? 0.5 : split[o1.key] / othersSum;

    let v1 = clamp(Math.round(ratio * remaining), o1);
    let v2 = remaining - v1;
    if (v2 < o2.min) v2 = o2.min;
    else if (v2 > o2.max) v2 = o2.max;
    v1 = clamp(remaining - v2, o1);
    v2 = remaining - v1;

    onChange({ ...split, [key]: value, [o1.key]: v1, [o2.key]: v2 });
  };

  return (
    <div className={disabled ? "space-y-5 opacity-50 pointer-events-none" : "space-y-5"}>
      {macroMeta.map((m) => {
        const pct = split[m.key];
        const grams = Math.round((calories * (pct / 100)) / m.kcalPerG);
        const frac = ((pct - m.min) / (m.max - m.min)) * 100;
        return (
          <div key={m.key}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-sm font-semibold text-charcoal">{m.label}</span>
              <span className="text-xs text-charcoal-faint">
                {pct}% · {grams}g
              </span>
            </div>
            {/* QA 13.0: "the progress bar was colored based on each their
                color before the dot. Please reapply." A CSS gradient on the
                track itself (rather than relying on `accent-color`, whose
                native fill-before-thumb rendering varies by browser) keeps
                the three sliders visually consistent while restoring the
                per-macro colored fill. */}
            <input
              type="range"
              min={m.min}
              max={m.max}
              value={pct}
              onChange={(e) => handleSlide(m.key, Number(e.target.value))}
              disabled={disabled}
              className="w-full h-2 rounded-full appearance-none"
              style={{
                accentColor: m.color,
                backgroundImage: `linear-gradient(to right, ${m.color} ${frac}%, rgb(var(--c-cream-soft)) ${frac}%)`,
              }}
            />
          </div>
        );
      })}
      <p className="text-xs text-charcoal-faint">
        Adjusting one macro rebalances the other two within evidence-based ranges so they always total
        100%.
      </p>
    </div>
  );
};
