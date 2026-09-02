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
import {
  Plus,
  Star,
  RefreshCw,
  UtensilsCrossed,
  Trash2,
  ChevronDown,
  ChevronUp,
  Undo2,
} from "lucide-react";
import { foodCategoryIcon } from "../../utils/icons";
import { isFoodRestricted } from "../../utils/dietaryRestrictions";
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
  const { foodLog, nutritionGoal, selectedDate, copyYesterdayMeal, removeFoodEntry, dietaryRestriction, recoverySensitive } =
    useApp();
  const [tab, setTab] = useState<Tab>("diary");
  const [addOpen, setAddOpen] = useState(false);
  const [addMeal, setAddMeal] = useState<MealType>("lunch");
  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  // QA 11.0: meal sections collapse like Routine folders on Workout >
  // Routines.
  const [collapsedMeals, setCollapsedMeals] = useState<Set<MealType>>(new Set());
  // QA 11.0: "Add an undo button... which only appears after someone
  // swipes or double taps to add food... only remain appearing for 15
  // seconds." Tracks which meal + which entry ids a copy just added.
  const [undoState, setUndoState] = useState<{ meal: MealType; ids: string[] } | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  const rowTouchStart = useRef<{ x: number; y: number } | null>(null);
  const mealTouchStart = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<{ meal: MealType; at: number } | null>(null);

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

  const toggleCollapsed = (meal: MealType) =>
    setCollapsedMeals((prev) => {
      const next = new Set(prev);
      if (next.has(meal)) next.delete(meal);
      else next.add(meal);
      return next;
    });

  const handleCopyYesterdayMeal = (meal: MealType) => {
    const ids = copyYesterdayMeal(meal);
    if (ids.length === 0) return;
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    setUndoState({ meal, ids });
    undoTimerRef.current = window.setTimeout(() => setUndoState(null), 15000);
  };

  const handleUndo = () => {
    if (!undoState) return;
    undoState.ids.forEach((id) => removeFoodEntry(id));
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    setUndoState(null);
  };

  // QA 11.0: "Firstly make it 'Swipe right or Double Tap'." — a swipe-right
  // or a double-tap on a meal's header copies yesterday's food for that
  // meal only, instead of one global gesture for the whole diary.
  const onMealTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    mealTouchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onMealTouchEnd = (e: React.TouchEvent, meal: MealType) => {
    if (!mealTouchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - mealTouchStart.current.x;
    const dy = t.clientY - mealTouchStart.current.y;
    mealTouchStart.current = null;
    if (dx > SWIPE_THRESHOLD && Math.abs(dy) < 40) {
      handleCopyYesterdayMeal(meal);
    }
  };
  const onMealTap = (meal: MealType) => {
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.meal === meal && now - last.at < 350) {
      lastTapRef.current = null;
      handleCopyYesterdayMeal(meal);
    } else {
      lastTapRef.current = { meal, at: now };
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
      <div key={label}>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[12px] font-semibold text-charcoal-soft">{label}</span>
          <span className="text-[12px] text-charcoal-faint">
            {Math.round(value)} / {target}g
            {over > 0 && <span className="text-status-high font-semibold"> (+{over}g)</span>}
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
        <div className="animate-fade-slide-up">
          <DateSelector />

          {/* QA 12.0 recovery-sensitive experience: "Hide calorie and macro
              totals... Disable deficit/remaining-calorie language... Use
              neutral food language." Same diary, same entries below — just
              no numbers-first summary card above them. */}
          {recoverySensitive ? (
            <Card className="mb-6">
              <p className="text-sm font-bold text-charcoal mb-1">
                {todaysEntries.length === 0 ? "Nothing logged yet today" : `${todaysEntries.length} item${todaysEntries.length === 1 ? "" : "s"} logged today`}
              </p>
              <p className="text-xs text-charcoal-faint">
                Meals, notes, and how you're feeling — no calorie counting required.
              </p>
            </Card>
          ) : (
            <Card className="mb-6">
              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <p className="text-[34px] font-extrabold text-charcoal leading-none tracking-[-0.035em] tabular-nums">
                    {Math.round(totals.calories).toLocaleString()}
                  </p>
                  <p className="text-[11.5px] font-medium text-charcoal-faint mt-1">of {targets.calories.toLocaleString()} kcal</p>
                </div>
                <span className="text-[12px] font-bold text-primary-deep-text bg-primary-pale rounded-full px-3 py-1.5">
                  {targets.calories - Math.round(totals.calories)} kcal left
                </span>
              </div>
              <div className="space-y-3">
                {macroRow("Protein", totals.protein, targets.protein, "#7D6BB5")}
                {macroRow("Carbs", totals.carbs, targets.carbs, "#C8BFE9")}
                {macroRow("Fat", totals.fat, targets.fat, "#A2C8C2")}
              </div>
            </Card>
          )}

          {/* QA 11.0: the global swipe hint moves per-meal (each header
              below is itself the swipe/double-tap target) — this is now
              just a one-time explainer instead of 4 repeated hint rows. */}
          <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-charcoal-faint mb-4 -mt-2">
            <RefreshCw size={11} /> Swipe right or double-tap a meal to copy yesterday's food
          </p>

          <div className="space-y-5">
            {mealOrder.map((meal) => {
              const entries = grouped[meal];
              const mealCal = entries.reduce((s, e) => s + e.food.calories * entryMultiplier(e), 0);
              const mealProtein = entries.reduce((s, e) => s + e.food.protein * entryMultiplier(e), 0);
              const mealCarbs = entries.reduce((s, e) => s + e.food.carbs * entryMultiplier(e), 0);
              const mealFat = entries.reduce((s, e) => s + e.food.fat * entryMultiplier(e), 0);
              const collapsed = collapsedMeals.has(meal);
              const showUndo = undoState?.meal === meal;
              return (
                <div key={meal}>
                  <div
                    // QA 13.0: "Have the titles breakfast, lunch, dinner,
                    // snacks be colored black, while the box that has them
                    // be colored the current font color" — inverts QA 12.0's
                    // choice: the purple now lives on the row's background
                    // instead of the title text.
                    className="flex items-center justify-between mb-2.5 rounded-2xl bg-primary-pale px-3.5 py-2.5"
                    onTouchStart={onMealTouchStart}
                    onTouchEnd={(ev) => onMealTouchEnd(ev, meal)}
                    onClick={() => onMealTap(meal)}
                  >
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        toggleCollapsed(meal);
                      }}
                      className="tap flex items-center gap-1.5"
                      aria-label={collapsed ? `Expand ${mealLabels[meal]}` : `Collapse ${mealLabels[meal]}`}
                    >
                      {collapsed ? (
                        <ChevronDown size={15} className="text-charcoal-faint" />
                      ) : (
                        <ChevronUp size={15} className="text-charcoal-faint" />
                      )}
                      <h3 className="font-display text-[15px] font-bold text-charcoal">
                        {mealLabels[meal]}
                      </h3>
                    </button>
                    <div className="flex items-center gap-2">
                      {/* QA 11.0: "Add an undo button to the far right, in a
                          light grey shade color, which only appears after
                          someone swipes or double taps to add food... only
                          remain appearing for 15 seconds." */}
                      {showUndo && (
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleUndo();
                          }}
                          className="tap flex items-center gap-1 text-[10.5px] font-semibold text-charcoal-soft bg-cream-soft rounded-full px-2.5 py-1"
                        >
                          <Undo2 size={11} /> Undo
                        </button>
                      )}
                      {entries.length > 0 && !recoverySensitive && (
                        <span className="text-[11.5px] font-medium text-charcoal-faint">{Math.round(mealCal)} kcal</span>
                      )}
                    </div>
                  </div>
                  {collapsed ? null : entries.length === 0 ? (
                    <button
                      onClick={() => openAdd(meal)}
                      className="tap w-full flex items-center justify-between rounded-2xl border-[1.5px] border-dashed border-charcoal/[0.16] px-4 py-3.5 text-charcoal-faint hover:border-primary/40"
                    >
                      <span className="text-[13px] font-medium">Not logged</span>
                      <Plus size={16} />
                    </button>
                  ) : (
                    <Card padded={false} className="divide-y divide-charcoal/[0.04]">
                      {entries.map((e) => {
                        const Icon = foodCategoryIcon[e.food.category] ?? UtensilsCrossed;
                        const revealed = revealedId === e.id;
                        // QA 11.0: "Pressing a specific restriction will
                        // highlight specific food diary items that are not
                        // compatible with the restriction."
                        const restricted = !!dietaryRestriction && isFoodRestricted(e.food, dietaryRestriction);
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
                              className={`tap relative z-10 w-full flex items-center justify-between px-4 py-3 text-left transition-transform duration-200 ${
                                restricted ? "bg-status-high-bg" : "bg-cream-card hover:bg-cream-soft"
                              }`}
                              style={{ transform: revealed ? "translateX(-80px)" : "translateX(0)" }}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    restricted ? "bg-status-high/[0.14]" : "bg-primary-pale"
                                  }`}
                                >
                                  <Icon size={16} className={restricted ? "text-status-high" : "text-primary-dark"} />
                                </span>
                                <div>
                                  <p className="text-[13.5px] font-semibold text-charcoal flex items-center gap-1.5">
                                    {e.food.name}
                                    {e.food.isLebanese && <Star size={10} className="text-gold fill-gold" />}
                                    {restricted && (
                                      <span className="text-[9px] font-bold uppercase text-status-high bg-status-high-bg rounded-full px-1.5 py-0.5">
                                        Not compatible
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[11px] font-medium text-charcoal-faint">
                                    {e.quantity !== 1 ? `${e.quantity} × ` : ""}
                                    {e.unit && e.unit !== "serving" ? e.unit : e.food.serving}
                                  </p>
                                </div>
                              </div>
                              {!recoverySensitive && (
                                <span className="text-[11.5px] font-semibold text-charcoal-soft">
                                  {Math.round(e.food.calories * entryMultiplier(e))} kcal
                                </span>
                              )}
                            </button>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => openAdd(meal)}
                        className="tap w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-[11.5px] font-bold text-primary-dark hover:bg-primary-pale/40"
                      >
                        <Plus size={13} /> Add more
                      </button>
                    </Card>
                  )}
                  {!collapsed && entries.length > 0 && !recoverySensitive && (
                    <div className="flex items-center justify-center gap-3 mt-1.5 text-[10px] font-bold">
                      <span style={{ color: "#7D6BB5" }}>P {Math.round(mealProtein)}g</span>
                      <span style={{ color: "#8C7CC4" }}>C {Math.round(mealCarbs)}g</span>
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
          className="tap fixed bottom-[104px] right-5 z-30 w-14 h-14 rounded-full bg-primary text-white shadow-fab flex items-center justify-center"
        >
          <Plus size={22} />
        </button>
      )}

      <AddFoodSheet open={addOpen} onClose={() => setAddOpen(false)} defaultMeal={addMeal} />
      <EditFoodEntrySheet open={!!editingEntry} onClose={() => setEditingEntry(null)} entry={editingEntry} />
    </div>
  );
}
