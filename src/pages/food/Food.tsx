import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { Card } from "../../components/ui/Card";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { mealForCurrentTime } from "../../utils/mealForTime";
import { AddFoodSheet } from "../../components/food/AddFoodSheet";
import { EditFoodEntrySheet } from "../../components/food/EditFoodEntrySheet";
import { DateSelector } from "../../components/dashboard/DateSelector";
import {
  isReferenceOnlyTarget,
  mealLabels,
  REFERENCE_INTAKE_NOTE,
  sumNutrition,
  targetsFromGoal,
} from "../../services/nutrition";
import { copyDiaryEntry, deleteDiaryEntry, isRemoteEntryId } from "../../services/food";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { ConfirmCard } from "../../components/ui/ConfirmCard";
import { Toast } from "../../components/ui/Toast";
import { CopyToSheet } from "../../components/food/CopyToSheet";
import { COPY_MEAL_LABEL, copyToastDate } from "../../utils/copyTo";
import { todayLocal } from "../../utils/date";
import type { MealType, FoodLogEntry } from "../../types";
import { Plus, Star, RefreshCw, Trash2, ChevronDown, ChevronRight, Undo2, Sunrise, Clock, Sun, Sunset, EllipsisVertical, ListChecks, SquareDashedMousePointer, Copy, Check } from "lucide-react";
import { isFoodRestricted } from "../../utils/dietaryRestrictions";
import GoalsPanel from "./GoalsPanel";
import MealPrepPanel from "./MealPrepPanel";
import { foodTabs, type Tab } from "./foodTabs";
import { NumberPlaceholder } from "../../components/ui/NumberPlaceholder";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx } from "../../theme/textSize";

/**
 * Mobile v5.1 R3, dark mode (no light islands): the meal cards follow the
 * dark tokens. These are the colours with no exact token, as [light, dark]:
 * the macro letters (primary.deep dark, the carbs lavender, secondary.deep
 * dark), the select circle's ring (3:1 on the card), and the Delete pill
 * (danger.tint and danger dark).
 */
const DIARY_COLORS = {
  protein: ["rgb(var(--th-7d6bb5))", "rgb(var(--th-b7abde))"],
  carbs: ["rgb(var(--th-8c7cc4))", "rgb(var(--th-aea1dc))"],
  fat: ["rgb(var(--th-4f7f78))", "rgb(var(--th-7fb3a9))"],
  selectRing: ["#D1CAEB", "#8A8698"],
  deleteBg: ["#FCEDEC", "#3C2A30"],
  deleteBorder: ["#F2CFCC", "rgba(255,107,94,0.3)"],
  deleteInk: ["#B4372C", "#FF6B5E"],
} as const;
const dc = (key: keyof typeof DIARY_COLORS, dark: boolean): string => DIARY_COLORS[key][dark ? 1 : 0];

// Item 7: the Diary's own display order (Breakfast, Snack, Lunch, Dinner) —
// deliberately separate from the shared `mealOrder` export (services/
// nutrition), which stays breakfast/lunch/dinner/snack for the meal-picker
// sheets (AddFoodSheet, CreateMealSheet) that still import it.
const diaryMealOrder: MealType[] = ["breakfast", "snack", "lunch", "dinner"];

// Master handover, CentiumTabFrame `food.diary` with quick-add "timeOfDay":
// the quick-add tiles, like the meal cards, read "Snacks" (approved
// decision 7). Each tile carries its own sampled fill and time-of-day glyph.
// Light mode uses the board's fills (decision 14). In dark mode the white
// 10 px labels need 4.5:1, which the board's fills (1.9 to 3.3:1) miss, so
// each is its own hue scaled down, keeping the dawn-to-dusk steps: 4.5, 5.0,
// 5.0, 5.6:1.
const quickAddTiles: Record<MealType, { label: string; fill: string; fillDark: string; Icon: typeof Sunrise }> = {
  breakfast: { label: "Breakfast", fill: "rgb(var(--th-beb4e6))", fillDark: "rgb(var(--th-797292))", Icon: Sunrise },
  snack: { label: "Snacks", fill: "rgb(var(--th-b1a5df))", fillDark: "rgb(var(--th-726a90))", Icon: Clock },
  lunch: { label: "Lunch", fill: "rgb(var(--th-b1a5e0))", fillDark: "rgb(var(--th-726a90))", Icon: Sun },
  dinner: { label: "Dinner", fill: "rgb(var(--th-9284c4))", fillDark: "rgb(var(--th-6b6190))", Icon: Sunset },
};

const SWIPE_THRESHOLD = 60;

// The calorie hero's height, so its placeholder does not shift the page.
const HERO_PLACEHOLDER_HEIGHT = 116;

export default function Food() {
  const { user, foodLog, nutritionGoal, selectedDate, copyYesterdayMeal, removeFoodEntry, dietaryRestriction, recoverySensitive, recoveryModePending, diaryError, authUserId, addFoodEntryRecord } =
    useApp();
  const dark = useIsDark();
  // Task X follow-up: every per-meal and per-entry number waits for the
  // account's recovery setting too, not only the totals card.
  const hideNumbers = recoverySensitive || recoveryModePending;
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("diary");
  const [addOpen, setAddOpen] = useState(false);
  const [addMeal, setAddMeal] = useState<MealType>("lunch");
  // FO7: which meal the sheet suggests for; null from the floating +.
  const [addFor, setAddFor] = useState<MealType | null>(null);
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
  // FO1.1 selection: one meal of the day being viewed at a time, never kept
  // after leaving the Diary (it is page state, and cleared on a day change).
  const [selecting, setSelecting] = useState<{ meal: MealType; date: string; ids: Set<string> } | null>(null);
  const [mealMenu, setMealMenu] = useState<{ meal: MealType; anchor: HTMLElement } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkToast, setBulkToast] = useState<string | null>(null);

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

  const openAdd = (meal: MealType, suggestFor: MealType | null = meal) => {
    setAddMeal(meal);
    setAddFor(suggestFor);
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

  // --- FO1.1 select, delete and copy ------------------------------------
  // Leaving the Diary tab or changing day ENDS the selection rather than
  // hiding it, so coming back never restores selection mode (reset during
  // render when the tab/day key changes, React's pattern for derived state).
  const selectionKey = `${tab}|${selectedDate}`;
  const [selectionKeySeen, setSelectionKeySeen] = useState(selectionKey);
  if (selectionKeySeen !== selectionKey) {
    setSelectionKeySeen(selectionKey);
    if (selecting) setSelecting(null);
  }
  const activeSelection = selecting && selecting.date === selectedDate && tab === "diary" ? selecting : null;
  const selectedEntries = activeSelection ? todaysEntries.filter((e) => activeSelection.ids.has(e.id)) : [];
  const startSelecting = (meal: MealType, all: boolean) =>
    setSelecting({
      meal,
      date: selectedDate,
      ids: new Set(all ? todaysEntries.filter((e) => e.meal === meal).map((e) => e.id) : []),
    });
  const toggleSelected = (id: string) =>
    setSelecting((cur) => {
      if (!cur) return cur;
      const ids = new Set(cur.ids);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      return { ...cur, ids };
    });
  const itemsLabel = (n: number) => `${n} item${n === 1 ? "" : "s"}`;

  /** Database first, as handleDelete; what fails stays selected and says so. */
  const deleteSelected = async () => {
    if (!activeSelection) return;
    setBulkBusy(true);
    setDeleteError(null);
    const failed = new Set<string>();
    for (const e of selectedEntries) {
      if (isRemoteEntryId(e.id)) {
        const result = await deleteDiaryEntry(e.id);
        if (!result.ok) {
          failed.add(e.id);
          continue;
        }
      }
      removeFoodEntry(e.id);
    }
    setBulkBusy(false);
    setConfirmDelete(false);
    if (failed.size > 0) {
      setDeleteError(`${itemsLabel(failed.size)} couldn't be deleted. Try again.`);
      setSelecting({ ...activeSelection, ids: failed });
      return;
    }
    setSelecting(null);
  };

  /** New entries, same food and quantity, in the chosen day and meal; the originals stay. */
  const copySelected = async (day: string, meal: MealType) => {
    if (!activeSelection || !authUserId) return;
    setBulkBusy(true);
    let copied = 0;
    for (const e of selectedEntries) {
      const result = await copyDiaryEntry(authUserId, e, day, meal);
      if (result.ok && result.entry) {
        addFoodEntryRecord(result.entry);
        copied++;
      }
    }
    setBulkBusy(false);
    setCopyOpen(false);
    if (copied < selectedEntries.length) {
      setDeleteError(`${itemsLabel(selectedEntries.length - copied)} couldn't be copied. Try again.`);
      return;
    }
    setSelecting(null);
    setBulkToast(`Copied ${itemsLabel(copied)} to ${COPY_MEAL_LABEL[meal]}, ${copyToastDate(day)}.`);
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
      <span className="shrink-0 text-[9px] text-white/[0.66] dark:text-white/90 tabular-nums">
        {Math.round(value)} / {target}g
      </span>
    </div>
  );

  return (
    <div>
      {/* Iteration 6 "Team": every redesigned screen uses a compact 19px
          title instead of PageHeader's 27px default — PageHeader itself is
          shared by many screens this handoff doesn't touch, so it keeps its
          existing size and this renders the title directly instead. */}
      <p className="mb-[11px] text-[19px] font-bold tracking-[-0.03em] text-charcoal">Food</p>

      {/* Goals & Macros draws its own tab bar (GoalsPanel), 5px above its
          cards; drawing this one too showed two identical bars there. */}
      {tab !== "goals" && (
        <SegmentedTabs
          className="mb-4 animate-fade-slide-up"
          items={foodTabs}
          activeKey={tab}
          onChange={(key) => setTab(key as Tab)}
        />
      )}

      {tab === "diary" && (
        <div className="animate-fade-slide-up">
          <DateSelector />

          {/* QA 12.0 recovery-sensitive experience: "Hide calorie and macro
              totals... Disable deficit/remaining-calorie language... Use
              neutral food language." Same diary, same entries below — just
              no numbers-first summary card above them. */}
          {recoveryModePending ? (
            // Task X follow-up: the account's recovery setting is still
            // loading on this browser, so no totals yet, in either form.
            <NumberPlaceholder height={HERO_PLACEHOLDER_HEIGHT} label="Today" className="mb-[13px]" />
          ) : recoverySensitive ? (
            <Card className="mb-6">
              <p className="text-sm font-bold text-charcoal mb-1">
                {todaysEntries.length === 0 ? "Nothing logged yet today" : `${todaysEntries.length} item${todaysEntries.length === 1 ? "" : "s"} logged today`}
              </p>
              <p className="text-xs text-charcoal-faint">
                Meals, notes, and how you're feeling, no calorie counting required.
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
              aria-label="Open Nutrient Summary"
              className="tap relative overflow-hidden rounded-[20px] px-4 py-[15px] mb-[13px] w-full text-left"
              style={{ background: "var(--gradient-food-hero)" }}
            >
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  <p className="text-[26px] font-extrabold leading-none tracking-[-0.04em] text-white tabular-nums">
                    {Math.round(totals.calories).toLocaleString()}
                  </p>
                  <p className="mt-1 text-[9.5px] text-white/70 dark:text-white/90">of {targets.calories.toLocaleString()} kcal</p>
                  {/* SAYS WHOSE NUMBER IT IS. With no height or weight on
                      record the target is a published reference intake rather
                      than anything computed from this person. */}
                  {isReferenceOnlyTarget(user) && (
                    <p className="mt-[3px] text-[8.5px] leading-[1.3] text-white/60 dark:text-white/90">
                      {REFERENCE_INTAKE_NOTE}
                    </p>
                  )}
                  <p className="mt-[7px] inline-block text-[9.5px] font-bold text-white bg-white/20 dark:bg-white/[0.08] rounded-full px-2 py-[3px]">
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
                <ChevronRight size={13} strokeWidth={2.4} className="text-white" />
              </span>
            </button>
          )}

          {/* A quick-add row above the meal list, always all four meals
              regardless of what's already logged (unlike the "+" inside each
              card, which only opens that one meal). Master handover: four
              solid lavender steps with time-of-day glyphs. */}
          {!hideNumbers && (
            <div className="flex gap-[6px] mb-[11px]">
              {diaryMealOrder.map((meal) => {
                const { label, fill, fillDark, Icon } = quickAddTiles[meal];
                return (
                  <button
                    key={meal}
                    onClick={() => openAdd(meal)}
                    className="tap flex-1 h-[38px] flex items-center justify-center gap-1.5 rounded-[11px] text-[10px] font-bold text-white whitespace-nowrap"
                    style={{ background: dark ? fillDark : fill }}
                  >
                    <Icon size={19} className="shrink-0" style={{ color: "#FFFFFF" }} />
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* A failed diary read leaves the cached entries on screen, so this
              says the list may be stale rather than implying it is empty. */}
          {diaryError && !deleteError && (
            <p className="text-[11.5px] font-semibold text-status-high text-center mb-4 -mt-2">
              Couldn't refresh your diary. Showing what was saved on this device.
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
              // Master handover (CentiumTabFrame food.diary): the card itself
              // is white (the dark card in dark mode) with the lavender hairline
              // and shadow; only its header carries the lavender wash, and only
              // while open.
              const headBg = collapsed ? "rgb(var(--c-cream-card))" : "rgb(var(--th-aea1dc) / 0.12)";
              return (
                <div
                  key={meal}
                  className="rounded-[15px] bg-cream-card overflow-hidden"
                  style={{ border: "1px solid rgb(var(--th-aea1dc) / 0.34)", boxShadow: "0 4px 14px rgb(var(--th-5f5093) / 0.08)" }}
                  onTouchStart={onMealTouchStart}
                  onTouchEnd={(ev) => onMealTouchEnd(ev, meal)}
                  onClick={() => onMealTap(meal)}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      toggleCollapsed(meal);
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        toggleCollapsed(meal);
                      }
                    }}
                    className="tap w-full flex items-start gap-2.5 cursor-pointer"
                    style={{ background: headBg, padding: "13px 14px", transition: "background-color .18s ease" }}
                    aria-label={collapsed ? `Expand ${mealLabels[meal]}` : `Collapse ${mealLabels[meal]}`}
                  >
                    <span className="flex-1 min-w-0 flex items-start" style={{ gap: 22 }}>
                      <h3 className="min-w-0 text-left text-[13.5px] font-bold text-charcoal">{mealLabels[meal]}</h3>
                      {/* FO1.1: the meal menu, with clear space after the title. */}
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setMealMenu({ meal, anchor: ev.currentTarget });
                        }}
                        aria-label={`${mealLabels[meal]} options`}
                        className="tap relative flex items-center justify-center shrink-0 before:absolute before:-inset-[10px] before:content-['']"
                        style={{ width: 16, height: 18, color: "rgb(var(--c-charcoal-faint))" }}
                      >
                        <EllipsisVertical size={15} />
                      </button>
                    </span>
                    {!hideNumbers && (
                      <span className="flex flex-col gap-1 w-[104px] shrink-0">
                        <span className="flex h-2 rounded-[3px] overflow-hidden bg-charcoal/[0.07]">
                          {mealCal > 0 && (
                            <>
                              <span style={{ width: `${(mealProtein / macroTotal) * 100}%`, background: dc("protein", dark) }} />
                              <span style={{ width: `${(mealCarbs / macroTotal) * 100}%`, background: "rgb(var(--th-aea1dc))" }} />
                              <span style={{ width: `${(mealFat / macroTotal) * 100}%`, background: "rgb(var(--th-a2c8c2))" }} />
                            </>
                          )}
                        </span>
                        <span className="flex items-center gap-1 text-[8.5px] font-bold tabular-nums whitespace-nowrap">
                          <span style={{ color: mealCal > 0 ? dc("protein", dark) : (dark ? "rgb(var(--c-charcoal-faint))" : "#A79E93") }}>P {Math.round(mealProtein)}g</span>
                          <span aria-hidden className="text-charcoal/20">|</span>
                          <span style={{ color: mealCal > 0 ? dc("carbs", dark) : (dark ? "rgb(var(--c-charcoal-faint))" : "#A79E93") }}>C {Math.round(mealCarbs)}g</span>
                          <span aria-hidden className="text-charcoal/20">|</span>
                          <span style={{ color: mealCal > 0 ? dc("fat", dark) : (dark ? "rgb(var(--c-charcoal-faint))" : "#A79E93") }}>F {Math.round(mealFat)}g</span>
                        </span>
                      </span>
                    )}
                    {!hideNumbers && (
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
                        transition: "transform 0.18s ease",
                      }}
                    />
                  </div>

                  {showUndo && (
                    <div className="flex justify-end" style={{ background: headBg, padding: "0 14px 8px" }}>
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
                    <div style={{ padding: "11px 14px 13px" }}>
                      {entries.length > 0 && (
                        <div className="flex flex-col gap-[3px] mb-2.5">
                          {entries.map((e) => {
                            const inSelection = activeSelection?.meal === meal;
                            const checked = inSelection && activeSelection!.ids.has(e.id);
                            const revealed = !inSelection && revealedId === e.id;
                            // QA 11.0: "Pressing a specific restriction will
                            // highlight specific food diary items that are not
                            // compatible with the restriction."
                            const restricted = !!dietaryRestriction && isFoodRestricted(e, dietaryRestriction);
                            return (
                              <div key={e.id} className="flex items-center" style={{ gap: inSelection ? 9 : 0 }}>
                                {inSelection && (
                                  <button
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      toggleSelected(e.id);
                                    }}
                                    role="checkbox"
                                    aria-checked={checked}
                                    aria-label={`Select ${e.name}`}
                                    className="tap shrink-0 flex items-center justify-center"
                                    style={{
                                      width: 20,
                                      height: 20,
                                      borderRadius: 10,
                                      background: checked ? "rgb(var(--c-primary-fill))" : "rgb(var(--c-cream-card))",
                                      border: checked ? "none" : `1.5px solid ${dc("selectRing", dark)}`,
                                      color: checked ? "rgb(var(--c-on-primary-fill))" : "rgb(var(--c-cream-card))",
                                    }}
                                  >
                                    {checked && <Check size={12} strokeWidth={3} />}
                                  </button>
                                )}
                              <div className="relative overflow-hidden rounded-[11px] flex-1 min-w-0">
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
                                  onClick={(ev) => {
                                    if (inSelection) {
                                      ev.stopPropagation();
                                      toggleSelected(e.id);
                                      return;
                                    }
                                    if (revealed) setRevealedId(null);
                                    else setEditingEntry(e);
                                  }}
                                  onTouchStart={inSelection ? undefined : onRowTouchStart}
                                  onTouchEnd={inSelection ? undefined : (ev) => onRowTouchEnd(ev, e.id)}
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
                                  {!hideNumbers && (
                                    <span className="shrink-0 text-[10.5px] font-bold text-charcoal-soft tabular-nums">
                                      {Math.round(e.calories)}
                                    </span>
                                  )}
                                </button>
                              </div>
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

                      {activeSelection?.meal === meal && (
                        <div className="flex items-center mb-2" style={{ gap: 7 }}>
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setConfirmDelete(true);
                            }}
                            disabled={activeSelection.ids.size === 0}
                            className="tap flex-1 inline-flex items-center justify-center disabled:opacity-45"
                            style={{ height: 36, gap: 6, borderRadius: 10, background: dc("deleteBg", dark), border: `1px solid ${dc("deleteBorder", dark)}`, color: dc("deleteInk", dark), fontSize: textPx(12.5), fontWeight: 700 }}
                          >
                            <Trash2 size={13} /> Delete ({activeSelection.ids.size})
                          </button>
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setCopyOpen(true);
                            }}
                            disabled={activeSelection.ids.size === 0}
                            className="tap flex-1 inline-flex items-center justify-center disabled:opacity-45"
                            style={{ height: 36, gap: 6, borderRadius: 10, background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", fontSize: textPx(12.5), fontWeight: 700 }}
                          >
                            <Copy size={13} /> Copy ({activeSelection.ids.size})
                          </button>
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setSelecting(null);
                            }}
                            className="tap shrink-0"
                            style={{ padding: "0 8px", height: 36, color: "rgb(var(--c-charcoal-faint))", fontSize: textPx(12.5), fontWeight: 500 }}
                          >
                            Cancel
                          </button>
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
          onClick={() => openAdd(mealForCurrentTime(), null)}
          aria-label="Add Food"
          // 104px over the nav plus the home-indicator inset, and 20px in from
          // the right edge of the centred 430px app column (01 GLOBAL).
          className="tap fixed bottom-[calc(env(safe-area-inset-bottom)+104px+var(--active-bar,0px))] right-[calc(var(--app-gutter)+20px)] z-30 w-14 h-14 rounded-full bg-primary-fill text-on-primary-fill shadow-fab flex items-center justify-center"
        >
          <Plus size={22} />
        </button>
      )}

      <AddFoodSheet open={addOpen} onClose={() => setAddOpen(false)} defaultMeal={addMeal} suggestMeal={addFor} />
      <EditFoodEntrySheet open={!!editingEntry} onClose={() => setEditingEntry(null)} entry={editingEntry} />

      {mealMenu && (() => {
        const mealEntries = todaysEntries.filter((e) => e.meal === mealMenu.meal);
        const empty = mealEntries.length === 0;
        const allChecked =
          activeSelection?.meal === mealMenu.meal && !empty && mealEntries.every((e) => activeSelection.ids.has(e.id));
        return (
          <PopupMenu
            open
            anchor={mealMenu.anchor}
            onClose={() => setMealMenu(null)}
            align="left"
            options={[
              { value: "all", label: allChecked ? "Deselect all" : "Select all", icon: <ListChecks size={14} />, disabled: empty },
              { value: "select", label: "Select", icon: <SquareDashedMousePointer size={14} />, disabled: empty },
            ]}
            onSelect={(v) => {
              const meal = mealMenu.meal;
              setMealMenu(null);
              if (empty) return;
              if (v === "all") {
                if (allChecked) setSelecting({ meal, date: selectedDate, ids: new Set() });
                else startSelecting(meal, true);
              } else startSelecting(meal, false);
            }}
          />
        );
      })()}

      <ConfirmCard
        open={confirmDelete && !!activeSelection}
        title={`Delete ${itemsLabel(activeSelection?.ids.size ?? 0)} from ${activeSelection ? mealLabels[activeSelection.meal] : ""}?`}
        subtitle={selectedDate === todayLocal() ? "They'll be removed from today's diary." : "They'll be removed from this day's diary."}
        busy={bulkBusy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void deleteSelected()}
      />

      {activeSelection && copyOpen && (
        <CopyToSheet
          open
          onClose={() => setCopyOpen(false)}
          count={activeSelection.ids.size}
          today={todayLocal()}
          meal={activeSelection.meal}
          busy={bulkBusy}
          onConfirm={(day, meal) => void copySelected(day, meal)}
        />
      )}

      <Toast open={!!bulkToast} message={bulkToast ?? ""} onExpire={() => setBulkToast(null)} />
    </div>
  );
}
