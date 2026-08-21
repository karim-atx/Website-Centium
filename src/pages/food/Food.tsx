import { useMemo, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { Chip } from "../../components/ui/Chip";
import { AddFoodSheet } from "../../components/food/AddFoodSheet";
import { DateSelector } from "../../components/dashboard/DateSelector";
import { mealOrder, mealLabels, sumNutrition, targetsFromGoal } from "../../services/nutrition";
import type { MealType } from "../../types";
import { Plus, Star, RefreshCw, Check } from "lucide-react";
import GoalsPanel from "./GoalsPanel";
import MealPrepPanel from "./MealPrepPanel";

type Tab = "diary" | "goals" | "prep";

const SWIPE_THRESHOLD = 60;

export default function Food() {
  const { foodLog, nutritionGoal, selectedDate, copyYesterdayFood } = useApp();
  const [tab, setTab] = useState<Tab>("diary");
  const [addOpen, setAddOpen] = useState(false);
  const [addMeal, setAddMeal] = useState<MealType>("lunch");
  const [copiedToast, setCopiedToast] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const todaysEntries = useMemo(
    () => foodLog.filter((e) => e.date === selectedDate),
    [foodLog, selectedDate]
  );
  const totals = useMemo(() => sumNutrition(todaysEntries), [todaysEntries]);
  const targets = targetsFromGoal(nutritionGoal);

  const grouped = useMemo(() => {
    const map: Record<MealType, typeof foodLog> = { breakfast: [], lunch: [], snack: [], dinner: [] };
    todaysEntries.forEach((e) => map[e.meal].push(e));
    return map;
  }, [todaysEntries]);

  const openAdd = (meal: MealType) => {
    setAddMeal(meal);
    setAddOpen(true);
  };

  const handleCopyYesterday = () => {
    copyYesterdayFood();
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 1600);
  };

  // "Copy yesterday's food" via a simple swipe-right gesture on the diary
  // list, MyNetDiary-style. A visible button covers the same action for
  // discoverability/accessibility.
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (dx > SWIPE_THRESHOLD && Math.abs(dy) < 40) {
      handleCopyYesterday();
    }
  };

  const macroRow = (label: string, value: number, target: number, color: string) => (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-semibold text-charcoal-soft">{label}</span>
        <span className="text-xs text-charcoal-faint">
          {Math.round(value)} / {target}g
        </span>
      </div>
      <ProgressBar progress={value / target} color={color} height={7} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Food" />

      <div className="flex gap-2 mb-5 animate-fade-slide-up">
        <Chip active={tab === "diary"} onClick={() => setTab("diary")}>
          Diary
        </Chip>
        <Chip active={tab === "goals"} onClick={() => setTab("goals")}>
          Goals & Macros
        </Chip>
        <Chip active={tab === "prep"} onClick={() => setTab("prep")}>
          Meal Prep
        </Chip>
      </div>

      {tab === "diary" && (
        <div className="animate-fade-slide-up" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <DateSelector />

          <Card className="mb-6">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <p className="text-3xl font-bold text-charcoal leading-none">
                  {Math.round(totals.calories).toLocaleString()}
                </p>
                <p className="text-xs text-charcoal-faint mt-1">of {targets.calories.toLocaleString()} kcal</p>
              </div>
              <span className="text-xs font-semibold text-sohati-dark bg-sohati-pale rounded-full px-3 py-1.5">
                {Math.max(targets.calories - Math.round(totals.calories), 0)} kcal left
              </span>
            </div>
            <div className="space-y-3">
              {macroRow("Protein", totals.protein, targets.protein, "#1B6B52")}
              {macroRow("Carbs", totals.carbs, targets.carbs, "#D9A441")}
              {macroRow("Fat", totals.fat, targets.fat, "#E97452")}
            </div>
          </Card>

          <button
            onClick={handleCopyYesterday}
            className="tap w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-sohati mb-4 -mt-2"
          >
            {copiedToast ? (
              <>
                <Check size={13} /> Copied yesterday's food
              </>
            ) : (
              <>
                <RefreshCw size={12} /> Swipe right, or tap, to copy yesterday's food
              </>
            )}
          </button>

          <div className="space-y-5">
            {mealOrder.map((meal) => {
              const entries = grouped[meal];
              const mealCal = entries.reduce((s, e) => s + e.food.calories * e.quantity, 0);
              return (
                <div key={meal}>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="font-display text-base font-semibold text-charcoal">
                      {mealLabels[meal]}
                    </h3>
                    {entries.length > 0 && (
                      <span className="text-xs text-charcoal-faint">{Math.round(mealCal)} kcal</span>
                    )}
                  </div>
                  {entries.length === 0 ? (
                    <button
                      onClick={() => openAdd(meal)}
                      className="tap w-full flex items-center justify-between rounded-2xl border-2 border-dashed border-charcoal/10 px-4 py-3.5 text-charcoal-faint hover:border-sohati/40"
                    >
                      <span className="text-sm">Not logged</span>
                      <Plus size={16} />
                    </button>
                  ) : (
                    <Card padded={false} className="divide-y divide-charcoal/[0.04]">
                      {entries.map((e) => (
                        <div key={e.id} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{e.food.emoji}</span>
                            <div>
                              <p className="text-sm font-semibold text-charcoal flex items-center gap-1.5">
                                {e.food.name}
                                {e.food.isLebanese && <Star size={10} className="text-gold fill-gold" />}
                              </p>
                              <p className="text-[11px] text-charcoal-faint">
                                {e.quantity !== 1 ? `${e.quantity} × ` : ""}
                                {e.food.serving}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-charcoal-soft">
                            {Math.round(e.food.calories * e.quantity)} kcal
                          </span>
                        </div>
                      ))}
                      <button
                        onClick={() => openAdd(meal)}
                        className="tap w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-sohati hover:bg-sohati-pale/40"
                      >
                        <Plus size={13} /> Add more
                      </button>
                    </Card>
                  )}
                </div>
              );
            })}
          </div>

          <Button fullWidth size="lg" className="mt-6" onClick={() => openAdd("lunch")}>
            <Plus size={16} /> Add Food
          </Button>
        </div>
      )}

      {tab === "goals" && <GoalsPanel />}
      {tab === "prep" && <MealPrepPanel />}

      <AddFoodSheet open={addOpen} onClose={() => setAddOpen(false)} defaultMeal={addMeal} />
    </div>
  );
}
