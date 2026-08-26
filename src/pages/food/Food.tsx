import { useMemo, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { Chip } from "../../components/ui/Chip";
import { AddFoodSheet } from "../../components/food/AddFoodSheet";
import { EditFoodEntrySheet } from "../../components/food/EditFoodEntrySheet";
import { DateSelector } from "../../components/dashboard/DateSelector";
import { mealOrder, mealLabels, sumNutrition, targetsFromGoal, entryMultiplier } from "../../services/nutrition";
import type { MealType, FoodLogEntry } from "../../types";
import { Plus, Star, RefreshCw, Check, UtensilsCrossed, Trash2 } from "lucide-react";
import { foodCategoryIcon } from "../../utils/icons";
import GoalsPanel from "./GoalsPanel";
import MealPrepPanel from "./MealPrepPanel";

type Tab = "diary" | "goals" | "prep";

const SWIPE_THRESHOLD = 60;

// V5 (QA 5.0): the global floating "+" has no specific meal section to
// anchor to, so it defaults to whichever meal makes sense for the current
// time of day, rather than being hardcoded to lunch.
function mealForCurrentTime(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 18) return "snack";
  return "dinner";
}

export default function Food() {
  const { foodLog, nutritionGoal, selectedDate, copyYesterdayFood, removeFoodEntry } = useApp();
  const [tab, setTab] = useState<Tab>("diary");
  const [addOpen, setAddOpen] = useState(false);
  const [addMeal, setAddMeal] = useState<MealType>("lunch");
  const [copiedToast, setCopiedToast] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const rowTouchStart = useRef<{ x: number; y: number } | null>(null);

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

  // Swipe-left on a logged food item reveals a Delete pill, Apple-UI style.
  const onRowTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    rowTouchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onRowTouchEnd = (e: React.TouchEvent, entryId: string) => {
    if (!rowTouchStart.current) return;
    e.stopPropagation();
    const t = e.changedTouches[0];
    const dx = t.clientX - rowTouchStart.current.x;
    const dy = t.clientY - rowTouchStart.current.y;
    rowTouchStart.current = null;
    if (dx < -SWIPE_THRESHOLD && Math.abs(dy) < 40) {
      setRevealedId(entryId);
    } else if (dx > SWIPE_THRESHOLD) {
      setRevealedId(null);
    }
  };

  const macroRow = (label: string, value: number, target: number, color: string) => {
    const over = Math.round(value) - target;
    return (
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-xs font-semibold text-charcoal-soft">{label}</span>
          <span className="text-xs text-charcoal-faint">
            {Math.round(value)} / {target}g
            {over > 0 && <span className="text-[#C0392B] font-semibold"> (+{over}g)</span>}
          </span>
        </div>
        <ProgressBar progress={value / target} color={over > 0 ? "#C0392B" : color} height={7} />
      </div>
    );
  };

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
              <span className="text-xs font-semibold text-primary-dark bg-primary-pale rounded-full px-3 py-1.5">
                {targets.calories - Math.round(totals.calories)} kcal remaining
              </span>
            </div>
            <div className="space-y-3">
              {macroRow("Protein", totals.protein, targets.protein, "#7D6BB5")}
              {macroRow("Carbs", totals.carbs, targets.carbs, "#D9A441")}
              {macroRow("Fat", totals.fat, targets.fat, "#6F9993")}
            </div>
          </Card>

          <button
            onClick={handleCopyYesterday}
            className="tap w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-primary mb-4 -mt-2"
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
              const mealCal = entries.reduce((s, e) => s + e.food.calories * entryMultiplier(e), 0);
              const mealProtein = entries.reduce((s, e) => s + e.food.protein * entryMultiplier(e), 0);
              const mealCarbs = entries.reduce((s, e) => s + e.food.carbs * entryMultiplier(e), 0);
              const mealFat = entries.reduce((s, e) => s + e.food.fat * entryMultiplier(e), 0);
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
                      className="tap w-full flex items-center justify-between rounded-2xl border-2 border-dashed border-charcoal/10 px-4 py-3.5 text-charcoal-faint hover:border-primary/40"
                    >
                      <span className="text-sm">Not logged</span>
                      <Plus size={16} />
                    </button>
                  ) : (
                    <Card padded={false} className="divide-y divide-charcoal/[0.04]">
                      {entries.map((e) => {
                        const Icon = foodCategoryIcon[e.food.category] ?? UtensilsCrossed;
                        const revealed = revealedId === e.id;
                        return (
                          <div key={e.id} className="relative overflow-hidden">
                            {revealed && (
                              <button
                                onClick={() => {
                                  removeFoodEntry(e.id);
                                  setRevealedId(null);
                                }}
                                aria-label={`Delete ${e.food.name}`}
                                className="tap absolute inset-y-0 right-0 w-20 flex flex-col items-center justify-center gap-0.5 bg-[#C0392B] text-white text-[10px] font-semibold z-0"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            )}
                            <button
                              onClick={() => (revealed ? setRevealedId(null) : setEditingEntry(e))}
                              onTouchStart={onRowTouchStart}
                              onTouchEnd={(ev) => onRowTouchEnd(ev, e.id)}
                              className="tap relative z-10 w-full flex items-center justify-between px-4 py-3 text-left bg-cream-card hover:bg-cream-soft transition-transform duration-200"
                              style={{ transform: revealed ? "translateX(-80px)" : "translateX(0)" }}
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-9 h-9 rounded-xl bg-primary-pale flex items-center justify-center shrink-0">
                                  <Icon size={16} className="text-primary-dark" />
                                </span>
                                <div>
                                  <p className="text-sm font-semibold text-charcoal flex items-center gap-1.5">
                                    {e.food.name}
                                    {e.food.isLebanese && <Star size={10} className="text-gold fill-gold" />}
                                  </p>
                                  <p className="text-[11px] text-charcoal-faint">
                                    {e.quantity !== 1 ? `${e.quantity} × ` : ""}
                                    {e.unit && e.unit !== "serving" ? e.unit : e.food.serving}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs font-semibold text-charcoal-soft">
                                {Math.round(e.food.calories * entryMultiplier(e))} kcal
                              </span>
                            </button>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => openAdd(meal)}
                        className="tap w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-primary hover:bg-primary-pale/40"
                      >
                        <Plus size={13} /> Add more
                      </button>
                    </Card>
                  )}
                  {entries.length > 0 && (
                    <div className="flex items-center justify-center gap-3 mt-1.5 text-[10px] font-semibold">
                      <span style={{ color: "#7D6BB5" }}>P {Math.round(mealProtein)}g</span>
                      <span style={{ color: "#D9A441" }}>C {Math.round(mealCarbs)}g</span>
                      <span style={{ color: "#6F9993" }}>F {Math.round(mealFat)}g</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "goals" && <GoalsPanel />}
      {tab === "prep" && <MealPrepPanel />}

      {tab === "diary" && (
        // V6 (QA 6.0): rendered outside the animate-fade-slide-up diary
        // wrapper — that wrapper's transform (persisted by fill-mode: both)
        // was turning it into the containing block for this fixed button,
        // so it scrolled along with the content instead of staying pinned
        // above it, reading as "attached" to whatever section landed under
        // it. Same root cause already fixed for BottomSheet via portaling.
        <button
          onClick={() => openAdd(mealForCurrentTime())}
          aria-label="Add Food"
          className="tap fixed bottom-24 right-5 z-30 w-14 h-14 rounded-full bg-primary text-white shadow-lift flex items-center justify-center"
        >
          <Plus size={22} />
        </button>
      )}

      <AddFoodSheet open={addOpen} onClose={() => setAddOpen(false)} defaultMeal={addMeal} />
      <EditFoodEntrySheet open={!!editingEntry} onClose={() => setEditingEntry(null)} entry={editingEntry} />
    </div>
  );
}
