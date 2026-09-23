import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { NutrientSections, type NutrientFilter } from "../../components/food/NutrientSections";
import { useApp } from "../../context/AppContext";
import { sumNutrientMaps, targetsFromGoal } from "../../services/nutrition";

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
// piece of the 8-section rendering itself lives in NutrientSections
// (shared with items 2/10's embedded "Advanced" view) — this file owns only
// what's specific to being a standalone page: the header, the filter
// popover chrome, and the footnote.
export default function NutrientSummaryPage() {
  const { foodLog, selectedDate, nutritionGoal, metricValues } = useApp();
  const [filter, setFilter] = useState<NutrientFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);

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

  return (
    <div>
      <PageHeader
        title="Nutrient Summary"
        subtitle={formatDiaryDate(selectedDate)}
        showBack
        right={
          <div className="relative">
            <button
              onClick={() => setFilterOpen((v) => !v)}
              aria-label="Filter nutrients"
              className={
                filter === "logged"
                  ? "tap relative w-10 h-10 rounded-full bg-primary-pale text-primary flex items-center justify-center"
                  : "tap relative w-10 h-10 rounded-full bg-cream-card border border-charcoal/[0.11] text-charcoal-soft flex items-center justify-center"
              }
            >
              <SlidersHorizontal size={16} />
              {filter === "logged" && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>

            {filterOpen &&
              createPortal(
                <>
                  {/* Item 10: a transparent backdrop closes the popover; no
                      caret; scales in from its top-right corner. White card,
                      8px padding (168px content, ~186 x 96 overall). */}
                  <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />
                  <div
                    className="fixed z-50 w-[186px] h-24 box-border rounded-[14px] bg-white p-2 flex flex-col gap-1 animate-popover-in"
                    style={{
                      top: 66,
                      right: 16,
                      transformOrigin: "top right",
                      border: "1px solid rgba(174,161,220,0.5)",
                      boxShadow: "0 12px 32px rgba(95,80,147,0.18)",
                    }}
                  >
                    {filterOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setFilter(opt.value);
                          setFilterOpen(false);
                        }}
                        className="tap w-full flex items-center justify-between rounded-[8px] px-2.5 py-2 text-left hover:bg-team-lavender/10"
                      >
                        <span className="text-[12px] font-semibold text-charcoal">{opt.label}</span>
                        {filter === opt.value && <Check size={14} className="text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>,
                document.body
              )}
          </div>
        }
      />

      {filter === "logged" && (
        <div className="flex items-center justify-between gap-2 rounded-full bg-team-lavender/10 px-3.5 py-2 mb-3 animate-fade-slide-up">
          <span className="text-[11px] font-semibold text-primary-deep-text">Logged only</span>
          <button onClick={() => setFilter("all")} className="tap text-[11px] font-bold text-primary shrink-0">
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

      <p className="mt-4 mb-2 text-[10px] leading-[1.5] text-charcoal-faint text-center">
        % Daily Value based on FDA reference values for adults. Calorie and macro targets come from your Goals.
      </p>
    </div>
  );
}
