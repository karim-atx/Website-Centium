import { useMemo, useState } from "react";
import clsx from "clsx";
import { ChevronLeft } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { targetsFromGoal } from "../../services/nutrition";
import { useBack } from "../../hooks/useBack";
import { useHideNumbers } from "../../hooks/useHideNumbers";
import { appLocale } from "../../i18n/format";
import { t, tk } from "../../i18n/core";
import { useWebLayout, WEB_CONTENT_MAX } from "../../components/web/useWebLayout";
import { FoodWebMenu } from "./web/FoodWebMenu";
import { NutrientSectionsWeb } from "./web/NutrientSectionsWeb";
import { entryTotals, type NutrientFilter } from "./web/nutrientRows";

// Website viewport v1 · WC-FO.4 Nutrient Summary (WC-FO Food Web v8, screen
// "nutrients"): the 64 header with the 32 back button, "Nutrient Summary"
// 24/32 600 and the day 13/500 #8C8378 beside it, the 36 filter button at the
// end (WC-FO.4.1: All nutrients / Logged only, anchored under it); then every
// card open in three masonry columns and the footnote. The sums, the filter,
// the "Logged only" banner and the recovery-sensitive redirect are the mobile
// page's.

const filterOptions: { value: NutrientFilter; label: string }[] = [
  { value: "all", label: tk("All nutrients") },
  { value: "logged", label: tk("Logged only") },
];

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] focus-visible:outline-offset-2";

export default function NutrientSummaryPageWeb() {
  const { foodLog, selectedDate, nutritionGoal, metricValues } = useApp();
  const back = useBack();
  const hide = useHideNumbers();
  const { rail } = useWebLayout();
  const margin = rail ? 24 : 32;
  const [filter, setFilter] = useState<NutrientFilter>("all");
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const todaysEntries = useMemo(() => foodLog.filter((e) => e.date === selectedDate), [foodLog, selectedDate]);
  const sums = useMemo(() => entryTotals(todaysEntries), [todaysEntries]);
  const targets = targetsFromGoal(nutritionGoal);
  const loggedOnly = filter === "logged";
  const day = new Date(`${selectedDate}T00:00:00`).toLocaleDateString(appLocale("en-US"), { weekday: "long", month: "long", day: "numeric" });

  if (hide) return <Navigate to="/app/food" replace />;

  return (
    <div data-web-page="nutrient-summary">
      <header
        className="sticky top-0 flex items-center justify-between bg-white"
        style={{ zIndex: 30, height: 64, boxSizing: "border-box", gap: 24, paddingInline: margin, borderBottom: "1px solid rgba(36,31,27,0.06)" }}
      >
        <div className="flex-1 min-w-0 flex items-center" style={{ gap: 6 }}>
          <button
            type="button"
            onClick={back}
            aria-label={t("Back")}
            title={t("Back")}
            className={clsx("flex-none flex items-center justify-center hover:!bg-[#F5F5F6]", FOCUS)}
            style={{ width: 32, height: 32, marginInlineStart: -6, borderRadius: 999, color: "#5B5349" }}
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          <h1 className="whitespace-nowrap" style={{ margin: 0, fontSize: 24, lineHeight: "32px", fontWeight: 600, letterSpacing: "-0.6px", color: "#241F1B" }}>
            {t("Nutrient Summary")}
          </h1>
          <span className="whitespace-nowrap" style={{ marginInlineStart: 10, fontSize: 13, fontWeight: 500, color: "#71685E" }}>
            {day}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => setFilterAnchor(filterAnchor ? null : e.currentTarget)}
          aria-label={t("Filter nutrients")}
          aria-haspopup="menu"
          aria-expanded={!!filterAnchor}
          className={clsx("relative flex-none flex items-center justify-center", FOCUS, !loggedOnly && "hover:!bg-[#F0EDF9]")}
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            boxSizing: "border-box",
            background: loggedOnly ? "rgba(174,161,220,0.22)" : "#FFFFFF",
            border: `1px solid ${loggedOnly ? "#A092E0" : "rgba(174,161,220,0.34)"}`,
            color: loggedOnly ? "#5F5093" : "#5B5349",
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "block" }}>
            <path d="M4 6h16" />
            <path d="M7 12h10" />
            <path d="M10 18h4" />
          </svg>
          {loggedOnly && <span className="absolute rounded-full" style={{ top: -3, insetInlineEnd: -3, width: 9, height: 9, background: "#6D50D3", border: "1.5px solid #FFFFFF" }} />}
        </button>
      </header>

      <div className="mx-auto flex flex-col" style={{ maxWidth: WEB_CONTENT_MAX, boxSizing: "border-box", padding: `24px ${margin}px` }}>
        {loggedOnly && (
          <div className="flex items-center" style={{ gap: 8, background: "#F3F3FD", borderRadius: 12, padding: "8px 12px", marginBottom: 16 }}>
            <span className="flex-none rounded-full" style={{ width: 6, height: 6, background: "#6D50D3" }} />
            <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#5F5093" }}>{t("Logged only")}</span>
            <span className="flex-1 min-w-0" />
            <button type="button" onClick={() => setFilter("all")} className={clsx("hover:underline", FOCUS)} style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#6D50D3" }}>
              {t("Show all")}
            </button>
          </div>
        )}
        <NutrientSectionsWeb
          layout="masonry"
          data={{
            ...sums,
            calorieTarget: targets.calories,
            proteinTarget: targets.protein,
            carbTarget: targets.carbs,
            fatTarget: targets.fat,
            bodyWeightKg: metricValues.weight ?? null,
            filter,
          }}
        />
        <p style={{ margin: "16px 2px 0", fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
          {t("% Daily Value based on FDA reference values for adults. Calorie and macro targets come from your Goals.")}
        </p>
      </div>

      {filterAnchor && (
        <FoodWebMenu
          anchor={filterAnchor}
          onClose={() => setFilterAnchor(null)}
          width={192}
          align="end"
          label={t("Filter nutrients")}
          selected={filter}
          options={filterOptions.map((o) => ({ value: o.value, label: t(o.label) }))}
          onSelect={setFilter}
        />
      )}
    </div>
  );
}
