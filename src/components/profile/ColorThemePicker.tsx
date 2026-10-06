import React from "react";
import { useApp } from "../../context/AppContext";
import { Check } from "lucide-react";
import clsx from "clsx";
import { COLOR_THEMES } from "../../theme/colorThemes";

// MO1.8 / MO1.8.6.1 Color theme (R20, D11): the five theme pairs as 38 pt
// circles split down the middle, primary on the left and secondary on the
// right, 61 pt apart. The selected one carries a 2 pt ring in the theme's
// primary (2 pt clear of the swatch), a white check (15 / 3), and its label in
// primary.accent at 11 / 700; the others 11 / 500 in text.secondary.
export const ColorThemePicker: React.FC = () => {
  const { colorTheme, setColorTheme } = useApp();

  return (
    // MO1.8 measured: five equal 46 pt columns (the width of "Centium" in
    // bold) whose centres are 61 apart, so 15 between them, starting at the
    // text column. Below 390 the gap narrows to 4 and then the columns shrink
    // (never under the 38 swatch), so all five fit at 320 (revision round).
    <div role="radiogroup" aria-label="Color theme" className="flex" style={{ columnGap: "clamp(4px, calc((100% - 230px) / 4), 15px)" }}>
      {COLOR_THEMES.map((t) => {
        const selected = colorTheme === t.value;
        return (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setColorTheme(t.value)}
            className="tap flex flex-col items-center gap-[9px] w-[46px] min-w-[38px] shrink"
          >
            <span
              className={clsx(
                "w-[38px] h-[38px] rounded-full flex items-center justify-center",
                selected && "ring-2 ring-offset-2 ring-offset-cream-card ring-primary"
              )}
              style={{ background: `linear-gradient(90deg, ${t.primary} 50%, ${t.secondary} 50%)` }}
            >
              {/* White on Centium's swatch, as drawn; the other swatches' light
                  halves (Sky's slate, Rose's blush, Gold) cannot carry white at
                  3:1, so their check is the app's near-black ink. */}
              {selected && (
                <Check size={15} className={t.value === "centium" ? "text-white" : "text-[#0D0B1A]"} strokeWidth={3} aria-hidden />
              )}
            </span>
            <span
              className={clsx("text-[11px] leading-none", selected ? "font-bold text-primary-accent" : "font-medium text-charcoal-soft")}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
