import React from "react";
import type { MacroSplit } from "../../types";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx } from "../../theme/textSize";

// QA 13.0: "adjusting the macro rebalancing should always adopt a scientific
// based approach and not just blindly rebalance to 100%." min/max per macro
// are the Acceptable Macronutrient Distribution Ranges (AMDR) from the
// Dietary Reference Intakes — the established evidence-based bounds for
// healthy adults — rather than the previous shared 5-70% for every macro.
// Mobile handoff item 8: the dashboard's own nutrition-bar trio colors,
// replacing the previous gold (carbs) and teal (fat) — protein was already
// on-spec.
// `ink` / `tint`: the value square at the end of each line on Goals & Macros
// (FO2.2 / FO4.2 / FO5.2), measured from the frames.
const macroMeta = [
  { key: "proteinPct" as const, label: "Protein", color: "rgb(var(--thi-7d6bb5))", ink: "rgb(var(--th-7d6bb5))", tint: "rgb(var(--th-f0edf9))", kcalPerG: 4, min: 10, max: 35 },
  { key: "carbsPct" as const, label: "Carbs", color: "rgb(var(--thi-aea1dc))", ink: "rgb(var(--th-8175c2))", tint: "rgb(var(--th-f0edf9))", kcalPerG: 4, min: 30, max: 65 },
  { key: "fatPct" as const, label: "Fat", color: "rgb(var(--thi-a2c8c2))", ink: "rgb(var(--th-6f9993))", tint: "#EAF4F2", kcalPerG: 9, min: 20, max: 40 },
];

// Mobile v5.1 R3, dark mode (no light islands): the value squares' dark
// shades, by macro. The lavender tint is primary.tint dark (#303141) and the
// sage one secondary.tint dark (#293339); each ink is its light ink lifted
// toward white until it reads at 4.5:1 on its square (liftTo,
// src/data/folderColors.ts). The bar colours sit on the empty track as fills
// and stay as they are.
const SQUARE_DARK: Record<MacroMeta["key"], { ink: string; tint: string }> = {
  proteinPct: { ink: "rgb(var(--th-a093c9))", tint: "rgb(var(--th-303141))" },
  carbsPct: { ink: "rgb(var(--th-9b92cf))", tint: "rgb(var(--th-303141))" },
  fatPct: { ink: "rgb(var(--th-7ba19c))", tint: "#293339" },
};

type MacroMeta = (typeof macroMeta)[number];

export const MACRO_REBALANCE_NOTE =
  "Adjusting one macro rebalances the other two within evidence-based ranges so they always total 100%.";

const clamp = (value: number, m: MacroMeta) => Math.min(m.max, Math.max(m.min, value));

interface Props {
  split: MacroSplit;
  calories: number;
  onChange: (split: MacroSplit) => void;
  disabled?: boolean;
  /**
   * Goals & Macros (FO2.2 / FO4.2 / FO5.2): each macro's grams and share sit
   * in a square at the end of its line and the slider is shortened to make
   * room. The caller renders MACRO_REBALANCE_NOTE itself. Off by default, so
   * the meal-plan builder is unchanged.
   */
  squares?: boolean;
}

/** Editing one slider rescales the other two proportionally to their current
 * ratio, then clamps both to their AMDR range so no macro can be dragged to
 * a scientifically unreasonable extreme just to make room for another. */
export const MacroSplitEditor: React.FC<Props> = ({ split, calories, onChange, disabled, squares }) => {
  const dark = useIsDark();
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

  if (squares) {
    return (
      <div className={`flex flex-col${disabled ? " opacity-50 pointer-events-none" : ""}`} style={{ gap: 12 }}>
        {macroMeta.map((m) => {
          const pct = split[m.key];
          const grams = Math.round((calories * (pct / 100)) / m.kcalPerG);
          const frac = ((pct - m.min) / (m.max - m.min)) * 100;
          const ink = dark ? SQUARE_DARK[m.key].ink : m.ink;
          return (
            <div key={m.key} className="flex items-center" style={{ gap: 13 }}>
              <div className="flex-1 min-w-0">
                <p style={{ margin: "0 0 8px", fontSize: textPx(13), fontWeight: 500, color: "rgb(var(--c-charcoal))" }}>{m.label}</p>
                <input
                  type="range"
                  min={m.min}
                  max={m.max}
                  value={pct}
                  onChange={(e) => handleSlide(m.key, Number(e.target.value))}
                  disabled={disabled}
                  aria-label={`${m.label} share`}
                  className="w-full block h-[4px] rounded-full appearance-none"
                  style={{
                    accentColor: m.color,
                    backgroundImage: `linear-gradient(to right, ${m.color} ${frac}%, rgb(var(--c-cream-soft)) ${frac}%)`,
                  }}
                />
              </div>
              <div
                className="flex flex-col items-center justify-center flex-none"
                style={{ width: 50, height: 36, borderRadius: 9, background: dark ? SQUARE_DARK[m.key].tint : m.tint }}
              >
                <span style={{ fontSize: textPx(12.5), fontWeight: 800, color: ink, lineHeight: 1.15 }}>{grams}g</span>
                <span style={{ fontSize: textPx(9.5), color: ink, opacity: 0.6, lineHeight: 1.15 }}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-5${disabled ? " opacity-50 pointer-events-none" : ""}`}>
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
      <p className="text-xs text-charcoal-faint">{MACRO_REBALANCE_NOTE}</p>
    </div>
  );
};
