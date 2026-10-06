import { useMemo, useState } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { NutrientSections, type NutrientFilter } from "../../components/food/NutrientSections";
import { useApp } from "../../context/AppContext";
import { sumNutrientMaps, targetsFromGoal } from "../../services/nutrition";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx } from "../../theme/textSize";
import { useBack } from "../../hooks/useBack";

/**
 * Mobile v5.1 R3, dark mode (no light islands). Inks and surfaces with an
 * exact-match token are written as the token; the lavender accents are
 * [light, dark]: the filter's active ink and the banner label (#5F5093) are
 * primary.deeper dark, the banner (#F3F3FD) primary.tint.2 dark, the "Show
 * all" link (#6D50D3) tabs.inactive.text dark (6.49:1 on the banner) and the
 * dots primary.accent dark.
 */
const SUMMARY_COLORS = {
  lavInk: ["rgb(var(--th-5f5093))", "rgb(var(--th-c8bfe9))"],
  banner: ["rgb(var(--th-f3f3fd))", "rgb(var(--th-2b2c3a))"],
  link: ["rgb(var(--th-6d50d3))", "rgb(var(--th-b7abde))"],
  dot: ["rgb(var(--th-6d50d3))", "rgb(var(--th-9a8cd6))"],
} as const;
const summaryColor = (key: keyof typeof SUMMARY_COLORS, dark: boolean): string => SUMMARY_COLORS[key][dark ? 1 : 0];

const filterOptions: { value: NutrientFilter; label: string }[] = [
  { value: "all", label: "All nutrients" },
  { value: "logged", label: "Logged only" },
];

const formatDiaryDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
};

// Mobile handoff item 9: a full-page nutrient breakdown for the selected
// Diary day, reached only from Food Diary's purple summary hero card. Every
// piece of the 8-section rendering itself lives in NutrientSections — this
// file owns only what's specific to being a standalone page: the header, the
// filter popover chrome, and the footnote (master handover item 10,
// CentiumNutrientSummary.dc.html).
export default function NutrientSummaryPage() {
  const { foodLog, selectedDate, nutritionGoal, metricValues, language, t } = useApp();
  const back = useBack();
  const dark = useIsDark();
  const [filter, setFilter] = useState<NutrientFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterButton, setFilterButton] = useState<HTMLButtonElement | null>(null);

  const todaysEntries = useMemo(() => foodLog.filter((e) => e.date === selectedDate), [foodLog, selectedDate]);
  // Master handover item 10: amounts are the day's sum across every logged
  // food. Calories and macros come from each entry's own totals (every entry
  // has them, so they are never partial); every other nutrient only from the
  // entries whose per-nutrient snapshot carries it.
  const { totals, present, itemCount } = useMemo(() => {
    const summed = sumNutrientMaps(todaysEntries.map((e) => e.nutrients));
    if (todaysEntries.length === 0) return summed;
    const macros: Record<string, number> = {
      calories: todaysEntries.reduce((s, e) => s + e.calories, 0),
      protein: todaysEntries.reduce((s, e) => s + e.protein, 0),
      total_fat: todaysEntries.reduce((s, e) => s + e.fat, 0),
      total_carbohydrates: todaysEntries.reduce((s, e) => s + e.carbs, 0),
    };
    const complete = Object.fromEntries(Object.keys(macros).map((k) => [k, todaysEntries.length]));
    return {
      totals: { ...summed.totals, ...macros },
      present: { ...summed.present, ...complete },
      itemCount: summed.itemCount,
    };
  }, [todaysEntries]);
  const targets = targetsFromGoal(nutritionGoal);
  const loggedOnly = filter === "logged";
  const BackIcon = language === "ar" ? ChevronRight : ChevronLeft;

  return (
    <div>
      {/* The design's own header (CentiumNutrientSummary.dc.html) — rendered
          here rather than through the shared PageHeader, whose title size,
          back button and spacing other screens rely on. */}
      <div
        className="flex items-start justify-between"
        style={{ marginBottom: 20, animation: "fade-slide-up .45s cubic-bezier(.22,1,.36,1) both" }}
      >
        <div className="flex items-start min-w-0" style={{ gap: 6 }}>
          <button
            onClick={back}
            aria-label={t("Back")}
            className="tap flex-none flex items-center justify-center rounded-full"
            style={{ width: 32, height: 32, marginLeft: -6, color: "rgb(var(--c-charcoal-soft))", background: "none", padding: 0 }}
          >
            <BackIcon size={18} strokeWidth={2} style={{ display: "block" }} />
          </button>
          <div className="min-w-0">
            <h1
              className="whitespace-nowrap"
              style={{ margin: 0, fontSize: textPx(24), fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.022em", color: "rgb(var(--c-charcoal))" }}
            >
              Nutrient Summary
            </h1>
            <p
              className="whitespace-nowrap"
              style={{ margin: "5px 0 0", fontSize: textPx(13), fontWeight: 500, lineHeight: 1.3, color: "rgb(var(--c-charcoal-muted))" }}
            >
              {formatDiaryDate(selectedDate)}
            </p>
          </div>
        </div>
        <button
          ref={setFilterButton}
          onClick={() => setFilterOpen(true)}
          aria-label="Filter nutrients"
          aria-haspopup="menu"
          aria-expanded={filterOpen}
          className="tap relative flex-none flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            padding: 0,
            background: loggedOnly ? "rgb(var(--th-aea1dc) / 0.22)" : "rgb(var(--c-cream-card))",
            border: `1px solid ${loggedOnly ? "rgb(var(--th-a092e0))" : "rgb(var(--th-aea1dc) / 0.34)"}`,
            color: loggedOnly ? summaryColor("lavInk", dark) : "rgb(var(--c-charcoal-soft))",
          }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: "block" }}
          >
            <path d="M4 6h16" />
            <path d="M7 12h10" />
            <path d="M10 18h4" />
          </svg>
          {loggedOnly && (
            <span
              className="absolute rounded-full"
              style={{ top: -3, right: -3, width: 9, height: 9, background: summaryColor("dot", dark), border: "1.5px solid rgb(var(--c-cream))" }}
            />
          )}
        </button>
      </div>

      {/* Handover 2026-09-29: the shared PopupMenu (02 "Popup / dropdown"),
          which this filter is the reference for. */}
      <PopupMenu
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        anchor={filterButton}
        options={filterOptions}
        selected={filter}
        onSelect={setFilter}
      />

      {loggedOnly && (
        <div
          className="flex items-center"
          style={{ gap: 7, background: summaryColor("banner", dark), borderRadius: 11, padding: "8px 11px", marginBottom: 12 }}
        >
          <span className="flex-none rounded-full" style={{ width: 6, height: 6, background: summaryColor("dot", dark) }} />
          <span style={{ fontSize: textPx(10.5), fontWeight: 700, color: summaryColor("lavInk", dark) }}>Logged only</span>
          <span className="flex-1 min-w-0" />
          <button
            onClick={() => setFilter("all")}
            className="tap"
            style={{ fontSize: textPx(10.5), fontWeight: 700, color: summaryColor("link", dark), background: "none", padding: 0 }}
          >
            Show all
          </button>
        </div>
      )}

      <NutrientSections
        totals={totals}
        present={present}
        itemCount={itemCount}
        calorieTarget={targets.calories}
        proteinTarget={targets.protein}
        carbTarget={targets.carbs}
        fatTarget={targets.fat}
        bodyWeightKg={metricValues.weight ?? null}
        filter={filter}
      />

      <p style={{ margin: "16px 2px 0", fontSize: textPx(9.5), lineHeight: 1.55, color: "rgb(var(--c-charcoal-muted))" }}>
        % Daily Value based on FDA reference values for adults. Calorie and macro targets come from your Goals.
      </p>
    </div>
  );
}
