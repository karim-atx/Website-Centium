import React from "react";
import { useApp } from "../../context/AppContext";
import { Check, Lock } from "lucide-react";
import clsx from "clsx";
import { COLOR_THEMES, PREMIUM_COLOR_THEMES } from "../../theme/colorThemes";
import { useIsDark } from "../../hooks/useIsDark";
import { usePremium } from "../../services/premium/hooks";
import { themeAccess, themeName } from "../../services/premium/g4";
import { askLocked } from "../premium/g3/useG3";
import { useColorThemeAccess } from "../premium/g4/useG4";
import { PremiumLabel } from "../premium/PremiumAskHost";

// v6 MO1.8 #14-#15: the Centium swatch draws #9A8CD6 | #6F9993 in light and
// #A991FE | #4F8F8A in dark (the other four as before; colorThemes.ts keeps
// the theme primaries the generator reads, so only the swatch changes).
const CENTIUM_SWATCH = { light: ["#9A8CD6", "#6F9993"], dark: ["#A991FE", "#4F8F8A"] } as const;

// MO1.8 / MO1.8.6.1 Color theme (R20, D11): the five theme pairs as 38 pt
// circles split down the middle, primary on the left and secondary on the
// right, 61 pt apart. The selected one carries a 2 pt ring in the theme's
// primary (2 pt clear of the swatch), a white check (15 / 3), and its label in
// primary.accent at 11 / 700; the others 11 / 500 in text.secondary.
export const ColorThemePicker: React.FC = () => {
  const { colorTheme, setColorTheme, language, t } = useApp();
  // MO1.8.5.1: in Arabic the swatch mirrors with the row, primary on the
  // right (the start side), and the names are the frame's Arabic ones.
  const halves = language === "ar" ? "270deg" : "90deg";
  const dark = useIsDark();

  // MO1.8 measured: five equal 46 pt columns (the width of "Centium" in
  // bold) whose centres are 61 apart, so 15 between them, starting at the
  // text column. Below 390 the gap narrows to 4 and then the columns shrink
  // (never under the 38 swatch), so all five fit at 320 (revision round).
  // Round G4: the Premium row follows (nothing while the switch is off).
  return (
    <>
      <div role="radiogroup" data-tz-fixed="" aria-label={t("Color theme")} className="flex" style={{ columnGap: "clamp(4px, calc((100% - 230px) / 4), 15px)" }}>
        {COLOR_THEMES.map((theme) => {
          const selected = colorTheme === theme.value;
          const [left, right] = theme.value === "centium" ? CENTIUM_SWATCH[dark ? "dark" : "light"] : [theme.primary, theme.secondary];
          return (
            <button
              key={theme.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setColorTheme(theme.value)}
              className="tap flex flex-col items-center gap-[9px] w-[46px] min-w-[38px] shrink"
            >
              <span
                className={clsx(
                  "w-[38px] h-[38px] rounded-full flex items-center justify-center",
                  selected && "ring-2 ring-offset-2 ring-offset-cream-card ring-primary"
                )}
                style={{ background: `linear-gradient(${halves}, ${left} 50%, ${right} 50%)` }}
              >
                {/* White on Centium's swatch, as drawn; the other swatches' light
                    halves (Sky's slate, Rose's blush, Gold) cannot carry white at
                    3:1, so their check is the app's near-black ink. */}
                {selected && (
                  <Check size={15} className={theme.value === "centium" ? "text-white" : "text-[#0D0B1A]"} strokeWidth={3} aria-hidden />
                )}
              </span>
              <span
                className={clsx("text-[11px] leading-none", selected ? "font-bold text-primary-accent" : "font-medium text-charcoal-soft")}
              >
                {t(theme.label)}
              </span>
            </button>
          );
        })}
      </div>
      <PremiumThemes halves={halves} />
    </>
  );
};

// undrawn (Round G, no handover)
// Round G4 · the three Premium themes, in a row of their own under the five
// (which stay free and unchanged): only with the Premium switch on and
// my_color_themes() listing them. Locked ones carry a lock and the Premium
// label above the row, and a tap opens the prompt instead of choosing; an
// ATXQ1 from saving puts the saved theme back and asks too
// (usePresentationSync). Nothing at all while the switch is off or loading.
// The names are the app's own t() labels (with their Arabic); my_color_themes()
// name is only the fallback for a key the app does not know (themeName).
const PremiumThemes: React.FC<{ halves: string }> = ({ halves }) => {
  const { colorTheme, setColorTheme, t } = useApp();
  const { premium } = usePremium();
  const rows = useColorThemeAccess();
  const shown = PREMIUM_COLOR_THEMES.map((th) => ({ th, access: themeAccess(th.db, { premiumOn: premium?.premiumOn === true, rows }) })).filter((x) => x.access !== "hidden");
  if (shown.length === 0) return null;
  const anyLocked = shown.some((x) => x.access === "locked");
  return (
    <div data-g4="premium-themes" className="mt-3.5">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-charcoal-faint">
        {t("Premium themes")}
        {anyLocked && <PremiumLabel />}
      </p>
      <div role="radiogroup" data-tz-fixed="" aria-label={t("Premium themes")} className="flex gap-2">
        {shown.map(({ th, access }) => {
          const selected = colorTheme === th.value;
          const locked = access === "locked";
          return (
            <button
              key={th.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={locked || undefined}
              data-g4-theme={th.db}
              onClick={() => (locked ? askLocked("premium_themes") : setColorTheme(th.value))}
              className="tap flex flex-col items-center gap-[9px] w-[64px] shrink"
            >
              <span
                className={clsx("w-[38px] h-[38px] rounded-full flex items-center justify-center", selected && "ring-2 ring-offset-2 ring-offset-cream-card ring-primary")}
                style={{ background: `linear-gradient(${halves}, ${th.primary} 50%, ${th.secondary} 50%)` }}
              >
                {/* The swatches' dark primaries carry white at 4.5:1 (#2F7D5B, #4146C8, #8C3A87). */}
                {selected ? <Check size={15} className="text-white" strokeWidth={3} aria-hidden /> : locked ? <Lock size={13} className="text-white" strokeWidth={2.5} aria-hidden /> : null}
              </span>
              <span className={clsx("text-center text-[11px] leading-tight", selected ? "font-bold text-primary-accent" : "font-medium text-charcoal-soft")}>{themeName(th.db, th.label, rows)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
