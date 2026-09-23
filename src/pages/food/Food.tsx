import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { Card } from "../../components/ui/Card";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { AddFoodSheet } from "../../components/food/AddFoodSheet";
import { EditFoodEntrySheet } from "../../components/food/EditFoodEntrySheet";
import { DateSelector } from "../../components/dashboard/DateSelector";
import { mealLabels, sumNutrition, targetsFromGoal } from "../../services/nutrition";
import { deleteDiaryEntry, isRemoteEntryId } from "../../services/food";
import type { MealType, FoodLogEntry } from "../../types";
import { Plus, Star, RefreshCw, Trash2, ChevronDown, ChevronRight, Undo2 } from "lucide-react";
import { isFoodRestricted } from "../../utils/dietaryRestrictions";
import GoalsPanel from "./GoalsPanel";
import MealPrepPanel from "./MealPrepPanel";
import { foodTabs, type Tab } from "./foodTabs";

// Item 7: the Diary's own display order (Breakfast, Snack, Lunch, Dinner) —
// deliberately separate from the shared `mealOrder` export (services/
// nutrition), which stays breakfast/lunch/dinner/snack for the meal-picker
// sheets (AddFoodSheet, CreateMealSheet) that still import it.
const diaryMealOrder: MealType[] = ["breakfast", "snack", "lunch", "dinner"];

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
  const { foodLog, nutritionGoal, selectedDate, copyYesterdayMeal, removeFoodEntry, dietaryRestriction, recoverySensitive, diaryError } =
    useApp();
  const navigate = useNavigate();
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
  // Deleting now goes to the database first, so it can fail and has to say so.
  const [deleteError, setDeleteError] = useState<string | null>(null);
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

  const handleCopyYesterdayMeal = async (meal: MealType) => {
    // Each copy is now a real insert, so this awaits the writes and only
    // offers Undo for rows that actually landed.
    const ids = await copyYesterdayMeal(meal);
    if (ids.length === 0) return;
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    setUndoState({ meal, ids });
    undoTimerRef.current = window.setTimeout(() => setUndoState(null), 15000);
  };

  /**
   * Deletes an entry, database first.
   *
   * Nothing is removed from the diary until the row is actually gone. An
   * optimistic removal would show the entry vanishing while it survived in
   * food_log_entries, and it would come back on the next hydration — worse
   * than a visible error, because the user would never know.
   *
   * Entries that only exist locally (AI Voice, custom meals, copy-yesterday
   * still write local-only rows) skip the request entirely; there is nothing
   * to delete remotely.
   */
  const handleDelete = async (id: string) => {
    setDeleteError(null);
    if (!isRemoteEntryId(id)) {
      removeFoodEntry(id);
      return;
    }
    const result = await deleteDiaryEntry(id);
    if (!result.ok) {
      setDeleteError(result.message ?? "Could not delete that entry.");
      return;
    }
    removeFoodEntry(id);
  };

  const handleUndo = () => {
    if (!undoState) return;
    // Copy-yesterday writes local-only entries today, so these are local ids;
    // handleDelete still routes each one correctly either way.
    undoState.ids.forEach((id) => void handleDelete(id));
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
      void handleCopyYesterdayMeal(meal);
    }
  };
  const onMealTap = (meal: MealType) => {
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.meal === meal && now - last.at < 350) {
      lastTapRef.current = null;
      void handleCopyYesterdayMeal(meal);
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

  // Iteration 6 "Team" §2.1: each macro's bar sits on the same row as its
  // label and gram readout now, instead of stacked beneath it.
  const macroRow = (label: string, value: number, target: number) => (
    <div key={label} className="flex items-center gap-2">
      <span className="w-[42px] shrink-0 text-[9.5px] font-bold text-white">{label}</span>
      <span className="flex-1 min-w-0 h-1 rounded-full bg-white/[0.28] overflow-hidden">
        <span className="block h-full rounded-full bg-white" style={{ width: `${Math.min(100, (value / (target || 1)) * 100)}%` }} />
      </span>
      <span className="shrink-0 text-[9px] text-white/[0.66] tabular-nums">
        {Math.round(value)} / {target}g
      </span>
    </div>
  );

  const quickAddMeals: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

  return (
    <div>
      {/* Iteration 6 "Team": every redesigned screen uses a compact 19px
          title instead of PageHeader's 27px default — PageHeader itself is
          shared by many screens this handoff doesn't touch, so it keeps its
          existing size and this renders the title directly instead. */}
      <p className="mb-[11px] text-[19px] font-bold tracking-[-0.03em] text-charcoal">Food</p>

      <SegmentedTabs
        className="mb-5 animate-fade-slide-up"
        items={foodTabs}
        activeKey={tab}
        onChange={(key) => setTab(key as Tab)}
      />

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
            // Iteration 6 "Team" §2.1: lavender-only hero (no halo), the
            // kcal figure + "of X kcal" + "left" chip stacked in a fixed-
            // width left column, each macro's bar on the same row as its
            // label and gram readout.
            <button
              type="button"
              onClick={() => {
                // Item 9: Nutrient Summary is its own page now, reached only
                // from here. selectedDate is global app state, so the page
                // reads it straight from context rather than needing it
                // passed through a route param.
                navigate("/app/food/nutrient-summary");
              }}
              className="tap relative overflow-hidden rounded-[20px] px-4 py-[15px] mb-[13px] w-full text-left"
              style={{ background: "var(--gradient-food-hero)" }}
            >
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  <p className="text-[26px] font-extrabold leading-none tracking-[-0.04em] text-white tabular-nums">
                    {Math.round(totals.calories).toLocaleString()}
                  </p>
                  <p className="mt-1 text-[9.5px] text-white/70">of {targets.calories.toLocaleString()} kcal</p>
                  <p className="mt-[7px] inline-block text-[9.5px] font-bold text-white bg-white/20 rounded-full px-2 py-[3px]">
                    {targets.calories - Math.round(totals.calories)} left
                  </p>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-2 pr-5">
                  {macroRow("Protein", totals.protein, targets.protein)}
                  {macroRow("Carbs", totals.carbs, targets.carbs)}
                  {macroRow("Fat", totals.fat, targets.fat)}
                </div>
              </div>
              <span
                className="absolute flex items-center justify-center rounded-full"
                style={{
                  width: 22,
                  height: 22,
                  right: 13,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.18)",
                }}
              >
                <ChevronRight size={13} className="text-white" />
              </span>
            </button>
          )}

          {/* Iteration 6 "Team" §2.5: a quick-add row above the meal list —
              fixed lavender-tinted pills, always all four meals regardless
              of what's already logged (unlike the "+" inside each card,
              which only opens that one meal). */}
          {!recoverySensitive && (
            <div className="flex gap-[6px] mb-[13px]">
              {quickAddMeals.map((meal) => (
                <button
                  key={meal}
                  onClick={() => openAdd(meal)}
                  className="tap flex-1 flex items-center justify-center gap-1 rounded-[11px] bg-team-lavender/[0.17] border border-team-lavender/[0.28] py-[9px] text-[10px] font-bold text-primary-deep-text whitespace-nowrap"
                >
                  <Plus size={11} className="text-team-lavender-deep" />
                  {mealLabels[meal] === "Snacks" ? "Snack" : mealLabels[meal]}
                </button>
              ))}
            </div>
          )}

          {/* A failed diary read leaves the cached entries on screen, so this
              says the list may be stale rather than implying it is empty. */}
          {diaryError && !deleteError && (
            <p className="text-[11.5px] font-semibold text-status-high text-center mb-4 -mt-2">
              Couldn't refresh your diary — showing what was saved on this device.
            </p>
          )}

          {deleteError && (
            <p className="text-[11.5px] font-semibold text-status-high text-center mb-4 -mt-2">
              {deleteError}
            </p>
          )}

          <div className="flex flex-col gap-2">
            {diaryMealOrder.map((meal) => {
              const entries = grouped[meal];
              // Plain sums: each entry already carries its own totals.
              const mealCal = entries.reduce((s, e) => s + e.calories, 0);
              const mealProtein = entries.reduce((s, e) => s + e.protein, 0);
              const mealCarbs = entries.reduce((s, e) => s + e.carbs, 0);
              const mealFat = entries.reduce((s, e) => s + e.fat, 0);
              const macroTotal = mealProtein + mealCarbs + mealFat || 1;
              const collapsed = collapsedMeals.has(meal);
              const showUndo = undoState?.meal === meal;
              // Iteration 6 "Team" §2.4: the copy-yesterday hint used to be
              // one persistent line above the whole list; it now only shows
              // while this specific meal's add sheet is open for it.
              const isAddingHere = addOpen && addMeal === meal;
              return (
                <div
                  key={meal}
                  className={clsx(
                    "rounded-[15px] px-3.5 py-[13px]",
                    collapsed ? "border border-charcoal/[0.08]" : "border border-team-lavender/[0.34] shadow-[0_4px_14px_rgba(95,80,147,0.08)]"
                  )}
                  // Item 7: collapsed meal cards are plain white; the open
                  // card gets the same lavender tint convention used for
                  // other collapsible sections in the app.
                  style={{ background: collapsed ? "#FFFFFF" : "rgba(174,161,220,0.12)" }}
                  onTouchStart={onMealTouchStart}
                  onTouchEnd={(ev) => onMealTouchEnd(ev, meal)}
                  onClick={() => onMealTap(meal)}
                >
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      toggleCollapsed(meal);
                    }}
                    className="tap w-full flex items-start gap-2.5"
                    aria-label={collapsed ? `Expand ${mealLabels[meal]}` : `Collapse ${mealLabels[meal]}`}
                  >
                    <h3 className="flex-1 min-w-0 text-left text-[13.5px] font-bold text-charcoal">{mealLabels[meal]}</h3>
                    {!recoverySensitive && (
                      <span className="flex flex-col gap-1 w-[104px] shrink-0">
                        <span className="flex h-2 rounded-[3px] overflow-hidden bg-charcoal/[0.07]">
                          {mealCal > 0 && (
                            <>
                              <span style={{ width: `${(mealProtein / macroTotal) * 100}%`, background: "#7D6BB5" }} />
                              <span style={{ width: `${(mealCarbs / macroTotal) * 100}%`, background: "#AEA1DC" }} />
                              <span style={{ width: `${(mealFat / macroTotal) * 100}%`, background: "#A2C8C2" }} />
                            </>
                          )}
                        </span>
                        <span className="flex items-center gap-1 text-[8.5px] font-bold tabular-nums whitespace-nowrap">
                          <span style={{ color: mealCal > 0 ? "#7D6BB5" : "#A79E93" }}>P {Math.round(mealProtein)}g</span>
                          <span className="text-charcoal/20">|</span>
                          <span style={{ color: mealCal > 0 ? "#8C7CC4" : "#A79E93" }}>C {Math.round(mealCarbs)}g</span>
                          <span className="text-charcoal/20">|</span>
                          <span style={{ color: mealCal > 0 ? "#4F7F78" : "#A79E93" }}>F {Math.round(mealFat)}g</span>
                        </span>
                      </span>
                    )}
                    {!recoverySensitive && (
                      <span className="w-[52px] shrink-0 text-right text-[11px] font-bold text-charcoal-soft tabular-nums">
                        {Math.round(mealCal)}
                      </span>
                    )}
                    {/* Item 7: a single chevron that rotates 180deg over
                        0.18s instead of swapping icons. */}
                    <ChevronDown
                      size={14}
                      className="text-charcoal-faint shrink-0"
                      style={{
                        transform: collapsed ? "rotate(0deg)" : "rotate(180deg)",
                        transition: "transform 0.18s",
                      }}
                    />
                  </button>

                  {showUndo && (
                    <div className="flex justify-end mt-1.5">
                      {/* QA 11.0: "Add an undo button to the far right, in a
                          light grey shade color, which only appears after
                          someone swipes or double taps to add food... only
                          remain appearing for 15 seconds." */}
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          handleUndo();
                        }}
                        className="tap flex items-center gap-1 text-[10.5px] font-semibold text-charcoal-soft bg-cream-soft rounded-full px-2.5 py-1"
                      >
                        <Undo2 size={11} /> Undo
                      </button>
                    </div>
                  )}

                  {!collapsed && (
                    <div className="mt-[11px]">
                      {entries.length > 0 && (
                        <div className="flex flex-col gap-[3px] mb-2.5">
                          {entries.map((e) => {
                            const revealed = revealedId === e.id;
                            // QA 11.0: "Pressing a specific restriction will
                            // highlight specific food diary items that are not
                            // compatible with the restriction."
                            const restricted = !!dietaryRestriction && isFoodRestricted(e, dietaryRestriction);
                            return (
                              <div key={e.id} className="relative overflow-hidden rounded-[11px]">
                                {revealed && (
                                  <button
                                    onClick={() => {
                                      void handleDelete(e.id);
                                      setRevealedId(null);
                                    }}
                                    aria-label={`Delete ${e.name}`}
                                    className="tap absolute inset-y-0 right-0 w-20 flex flex-col items-center justify-center gap-0.5 rounded-r-[11px] bg-[#C0392B] text-white text-[10px] font-semibold z-0"
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </button>
                                )}
                                <button
                                  onClick={() => (revealed ? setRevealedId(null) : setEditingEntry(e))}
                                  onTouchStart={onRowTouchStart}
                                  onTouchEnd={(ev) => onRowTouchEnd(ev, e.id)}
                                  className={clsx(
                                    "tap relative z-10 w-full flex items-center justify-between gap-2.5 rounded-[11px] px-[11px] py-2 text-left transition-transform duration-200",
                                    restricted ? "bg-status-high-bg" : "bg-team-lavender/10"
                                  )}
                                  style={{ transform: revealed ? "translateX(-80px)" : "translateX(0)" }}
                                >
                                  <span className="min-w-0">
                                    <span className="flex items-center gap-1.5 text-[12px] font-semibold text-charcoal">
                                      {e.name}
                                      {e.display.isLebanese && <Star size={10} className="text-gold fill-gold shrink-0" />}
                                      {restricted && (
                                        <span className="text-[9px] font-bold uppercase text-status-high bg-status-high-bg rounded-full px-1.5 py-0.5 shrink-0">
                                          Not compatible
                                        </span>
                                      )}
                                    </span>
                                    <span className="block text-[9.5px] text-charcoal-tertiary">
                                      {e.quantity !== 1 ? `${e.quantity} × ` : ""}
                                      {e.unit && e.unit !== "serving" ? e.unit : e.display.serving}
                                    </span>
                                  </span>
                                  {!recoverySensitive && (
                                    <span className="shrink-0 text-[10.5px] font-bold text-charcoal-soft tabular-nums">
                                      {Math.round(e.calories)}
                                    </span>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {isAddingHere && (
                        <div className="flex items-center gap-2 rounded-[11px] bg-teal/[0.13] border border-dashed border-team-teal-deep/40 px-[11px] py-[9px] mb-2">
                          <RefreshCw size={12} className="text-team-teal-deep shrink-0" />
                          <span className="text-[10.5px] leading-[1.45] text-team-teal-ink">
                            Swipe right or double-tap to copy yesterday's {mealLabels[meal].toLowerCase()}
                          </span>
                        </div>
                      )}

                      <button
                        onClick={() => openAdd(meal)}
                        className="tap w-full flex items-center justify-center gap-[7px] rounded-[11px] bg-team-lavender/[0.16] text-[11px] font-bold text-primary-deep-text py-[9px]"
                      >
                        <Plus size={13} /> {entries.length > 0 ? "Add more" : "Add food"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "goals" && <GoalsPanel onTabChange={setTab} />}
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
