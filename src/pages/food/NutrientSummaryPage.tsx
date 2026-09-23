import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
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
// piece of the 8-section rendering itself lives in NutrientSections — this
// file owns only what's specific to being a standalone page: the header, the
// filter popover chrome, and the footnote (master handover item 10,
// CentiumNutrientSummary.dc.html).
export default function NutrientSummaryPage() {
  const { foodLog, selectedDate, nutritionGoal, metricValues, language, t } = useApp();
  const navigate = useNavigate();
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
            onClick={() => navigate(-1)}
            aria-label={t("Back")}
            className="tap flex-none flex items-center justify-center rounded-full"
            style={{ width: 32, height: 32, marginLeft: -6, color: "#5B5349", background: "none", padding: 0 }}
          >
            <BackIcon size={18} strokeWidth={2} style={{ display: "block" }} />
          </button>
          <div className="min-w-0">
            <h1
              className="whitespace-nowrap"
              style={{ margin: 0, fontSize: 24, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.022em", color: "#241F1B" }}
            >
              Nutrient Summary
            </h1>
            <p
              className="whitespace-nowrap"
              style={{ margin: "5px 0 0", fontSize: 13, fontWeight: 500, lineHeight: 1.3, color: "#8C8378" }}
            >
              {formatDiaryDate(selectedDate)}
            </p>
          </div>
        </div>
        <button
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
            background: loggedOnly ? "rgba(174,161,220,0.22)" : "#FFFFFF",
            border: `1px solid ${loggedOnly ? "#A092E0" : "rgba(174,161,220,0.34)"}`,
            color: loggedOnly ? "#5F5093" : "#5B5349",
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
              style={{ top: -3, right: -3, width: 9, height: 9, background: "#6D50D3", border: "1.5px solid #FFFFFF" }}
            />
          )}
        </button>
      </div>

      {filterOpen &&
        createPortal(
          <div className="fixed inset-0" style={{ zIndex: 50 }}>
            <style>{`@keyframes nutrient-filter-pop-in { 0% { opacity: 0; transform: translateY(-6px) scale(0.96); } 100% { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
            <div
              className="absolute inset-0"
              onClick={() => setFilterOpen(false)}
              style={{ background: "rgba(36,31,27,0.18)", animation: "fade-in .2s ease both" }}
            />
            <div
              role="menu"
              className="absolute"
              style={{
                top: 66,
                right: 16,
                width: 168,
                boxSizing: "content-box",
                background: "#FFFFFF",
                border: "1px solid rgba(174,161,220,0.5)",
                borderRadius: 14,
                boxShadow: "0 12px 32px rgba(95,80,147,0.18)",
                padding: 8,
                animation: "nutrient-filter-pop-in .22s cubic-bezier(.22,1,.36,1) both",
                transformOrigin: "top right",
              }}
            >
              {filterOptions.map((opt, i) => {
                const on = filter === opt.value;
                return (
                  <button
                    key={opt.value}
                    role="menuitemradio"
                    aria-checked={on}
                    onClick={() => {
                      setFilter(opt.value);
                      setFilterOpen(false);
                    }}
                    className="tap w-full flex items-center text-left"
                    style={{
                      gap: 9,
                      borderRadius: 8,
                      padding: "9px 10px",
                      marginTop: i > 0 ? 6 : 0,
                      border: `1px solid ${on ? "#A092E0" : "#E5E6EB"}`,
                      background: on ? "#A092E0" : "#FAFAFB",
                      color: on ? "#FFFFFF" : "#241F1B",
                      fontSize: 12.5,
                      fontWeight: on ? 700 : 500,
                    }}
                  >
                    <span className="flex-1 min-w-0">{opt.label}</span>
                    {on && <Check size={13} strokeWidth={3} className="flex-none" style={{ display: "block" }} />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}

      {loggedOnly && (
        <div
          className="flex items-center"
          style={{ gap: 7, background: "#F3F3FD", borderRadius: 11, padding: "8px 11px", marginBottom: 12 }}
        >
          <span className="flex-none rounded-full" style={{ width: 6, height: 6, background: "#6D50D3" }} />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#5F5093" }}>Logged only</span>
          <span className="flex-1 min-w-0" />
          <button
            onClick={() => setFilter("all")}
            className="tap"
            style={{ fontSize: 10.5, fontWeight: 700, color: "#6D50D3", background: "none", padding: 0 }}
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

      <p style={{ margin: "16px 2px 0", fontSize: 9.5, lineHeight: 1.55, color: "#8C8378" }}>
        % Daily Value based on FDA reference values for adults. Calorie and macro targets come from your Goals.
      </p>
    </div>
  );
}
