import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Copy, EllipsisVertical, ListChecks, Pencil, Plus, RefreshCw, SquareDashedMousePointer, Star, Sun, Sunrise, Sunset, Trash2, Undo2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useOnline } from "../../hooks/useOnline";
import { mealForCurrentTime } from "../../utils/mealForTime";
import { AddFoodSheet } from "../../components/food/AddFoodSheet";
import { EditFoodEntrySheet } from "../../components/food/EditFoodEntrySheet";
import { DateSelector } from "../../components/dashboard/DateSelector";
import { isReferenceOnlyTarget, mealLabels, REFERENCE_INTAKE_NOTE, sumNutrition, targetsFromGoal } from "../../services/nutrition";
import { copyDiaryEntry, deleteDiaryEntry, getNutritionGoalOn, isRemoteEntryId } from "../../services/food";
import { OFFLINE_MESSAGE } from "../../services/network-error";
import { ConfirmCard } from "../../components/ui/ConfirmCard";
import { Toast } from "../../components/ui/Toast";
import { CopyToSheet } from "../../components/food/CopyToSheet";
import { COPY_MEAL_LABEL, copyToastDate } from "../../utils/copyTo";
import { todayLocal } from "../../utils/date";
import type { FoodLogEntry, MealType } from "../../types";
import { dietLabel, isFoodRestricted } from "../../utils/dietaryRestrictions";
import { FoodConflictBadge } from "../../components/food/FoodConflictBadge";
import { FoodFeedbackLine } from "../../components/food/FoodFeedbackLine";
import { worstBadge } from "../../services/nutrition/clientNutritionModel";
import { useDiaryExtras } from "./useFoodProfessional";
import { foodTabs, type Tab } from "./foodTabs";
import { useClientShare } from "../../components/share/client/useClientShare";
import { ShareEntryButton } from "../../components/share/client/ShareEntryButton";
import { foodCard } from "../../components/share/client/clientCardModel";
import { foodFacts } from "../../components/share/client/clientShareData";
import { isQueuedEntry } from "../../services/food/provisional";
import { removeQueued } from "../../services/health-log/offlineQueue";
import { appLocale } from "../../i18n/format";
import { t, tn, tk } from "../../i18n/core";
import { useWebLayout, WEB_CONTENT_MAX } from "../../components/web/useWebLayout";
import { FoodWebMenu } from "./web/FoodWebMenu";
import { NutrientSectionsWeb } from "./web/NutrientSectionsWeb";
import { entryTotals } from "./web/nutrientRows";
import { FoodWebTabs } from "./web/FoodWebTabs";
import GoalsPanelWeb from "./web/GoalsPanel.web";
import CustomPanelWeb from "./web/CustomPanel.web";

// Website viewport v1 · WC-FO Food (WC-FO Food Web v8): the Food page at
// 1024px and wider. A 64 header (Food 24/32 600, the day selector 260 wide in
// the middle, the 96 × 44 Add Food button at the end), the three tabs (40
// track), then on Diary a 12-column grid (8 at the 1024 rail): the calorie
// hero, the quick-add row and the meal cards (two columns, one at the rail)
// in 8 columns, the Nutrient Summary panel in the last 4. Clicking a food
// shows its nutrients in the panel (WC-FO.1.4); the hero opens every card of
// the day's summary there (WC-FO.1.5); a row's hover actions are Delete and
// ⋮ (Edit, Delete). Everything else, what is read and saved and when, is the
// mobile Diary's (Food.tsx), unchanged.

const DIARY_ORDER: MealType[] = ["breakfast", "snack", "lunch", "dinner"];

// FO Quick Add Web: the four tiles' fills and glyphs (the mobile tiles').
const QUICK: Record<MealType, { label: string; fill: string; Icon: typeof Sunrise }> = {
  breakfast: { label: tk("Breakfast"), fill: "#BEB4E6", Icon: Sunrise },
  snack: { label: tk("Snacks"), fill: "#B1A5DF", Icon: Clock },
  lunch: { label: tk("Lunch"), fill: "#B1A5E0", Icon: Sun },
  dinner: { label: tk("Dinner"), fill: "#9284C4", Icon: Sunset },
};

// FO Meal Card Web: the macro bar's segments and the letters' inks.
const SEG = { p: "#7D6BB5", c: "#AEA1DC", f: "#A2C8C2" };
const INK = { p: "#7D6BB5", c: "#8175C2", f: "#6F9993", none: "#A79E93" };

const SAVE_FAILED = tk("Couldn't save. Try again.");
const failedLine = (lead: string, offline: boolean) => t("{lead} {reason}", { lead, reason: offline ? t(OFFLINE_MESSAGE) : t("Try again.") });

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] focus-visible:outline-offset-2";

function DiaryShareButton({ share, date }: { share: ReturnType<typeof useClientShare>; date: string }) {
  const { foodLog, nutritionGoal } = useApp();
  const facts = foodFacts(foodLog, date, nutritionGoal.targetCalories);
  return (
    <ShareEntryButton
      label={t("Share your food day")}
      disabledHint={facts ? null : t("Nothing to share yet. Log food for this day first.")}
      onPress={() => facts && share.open(foodCard(facts))}
    />
  );
}

export default function FoodWeb() {
  const { user, foodLog, nutritionGoal, selectedDate, copyYesterdayMeal, removeFoodEntry, dietaryRestriction, recoverySensitive, recoveryModePending, diaryError, diaryLoading, retryDiary, authUserId, addFoodEntryRecord, metricValues, professionalTargets: proTargets } =
    useApp();
  const { rail } = useWebLayout();
  const margin = rail ? 24 : 32;
  const online = useOnline();
  const navigate = useNavigate();
  const share = useClientShare();
  const hideNumbers = recoverySensitive || recoveryModePending;
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(() => (new URLSearchParams(window.location.search).get("tab") === "prep" ? "prep" : "diary"));
  const [addOpen, setAddOpen] = useState(false);
  const [addMeal, setAddMeal] = useState<MealType>("lunch");
  const [addFor, setAddFor] = useState<MealType | null>(null);
  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null);
  const [collapsedMeals, setCollapsedMeals] = useState<Set<MealType>>(new Set());
  const [undoState, setUndoState] = useState<{ meal: MealType; ids: string[] } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  const [selecting, setSelecting] = useState<{ meal: MealType; date: string; ids: Set<string> } | null>(null);
  const [mealMenu, setMealMenu] = useState<{ meal: MealType; anchor: HTMLElement } | null>(null);
  const [rowMenu, setRowMenu] = useState<{ entry: FoodLogEntry; anchor: HTMLElement } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkToast, setBulkToast] = useState<string | null>(null);
  // Web only: the food shown in the panel (WC-FO.1.4) and the full summary (WC-FO.1.5).
  const [panelItemId, setPanelItemId] = useState<string | null>(null);
  const [fullSummary, setFullSummary] = useState(false);

  const todaysEntries = useMemo(() => foodLog.filter((e) => e.date === selectedDate), [foodLog, selectedDate]);
  const [allergyVersion, setAllergyVersion] = useState(0);
  const { conflicts, feedback, setFeedbackReply } = useDiaryExtras(todaysEntries, allergyVersion);
  const totals = useMemo(() => sumNutrition(todaysEntries), [todaysEntries]);
  const isPastDay = selectedDate < todayLocal();
  const [pastGoal, setPastGoal] = useState<{ date: string; goal: Awaited<ReturnType<typeof getNutritionGoalOn>> } | null>(null);
  useEffect(() => {
    if (!isPastDay) return;
    let live = true;
    void getNutritionGoalOn(selectedDate).then((goal) => {
      if (live) setPastGoal({ date: selectedDate, goal });
    });
    return () => {
      live = false;
    };
  }, [selectedDate, isPastDay]);
  const goalOfDay = isPastDay && pastGoal?.date === selectedDate && pastGoal.goal ? { ...nutritionGoal, ...pastGoal.goal } : nutritionGoal;
  const targets = targetsFromGoal(goalOfDay);

  const grouped = useMemo(() => {
    const map: Record<MealType, FoodLogEntry[]> = { breakfast: [], lunch: [], snack: [], dinner: [] };
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
    if (!online) {
      setSaveToast(OFFLINE_MESSAGE);
      return;
    }
    const ids = await copyYesterdayMeal(meal);
    if (ids.length === 0) return;
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    setUndoState({ meal, ids });
    undoTimerRef.current = window.setTimeout(() => setUndoState(null), 15000);
  };

  // Database first, as on mobile: nothing leaves the diary until the row is gone.
  const handleDelete = async (id: string) => {
    setDeleteError(null);
    if (isQueuedEntry(id)) {
      if (authUserId) removeQueued(authUserId, id.slice("queued:".length));
      removeFoodEntry(id);
      return;
    }
    if (!isRemoteEntryId(id)) {
      removeFoodEntry(id);
      return;
    }
    if (!online) {
      setSaveToast(OFFLINE_MESSAGE);
      return;
    }
    const result = await deleteDiaryEntry(id);
    if (!result.ok) {
      setSaveToast(result.message ?? SAVE_FAILED);
      return;
    }
    removeFoodEntry(id);
  };

  // FO1.1 selection: ends when the tab or the day changes (mobile rule).
  const selectionKey = `${tab}|${selectedDate}`;
  const [selectionKeySeen, setSelectionKeySeen] = useState(selectionKey);
  if (selectionKeySeen !== selectionKey) {
    setSelectionKeySeen(selectionKey);
    if (selecting) setSelecting(null);
    if (fullSummary) setFullSummary(false);
  }
  const activeSelection = selecting && selecting.date === selectedDate && tab === "diary" ? selecting : null;
  const selectedEntries = activeSelection ? todaysEntries.filter((e) => activeSelection.ids.has(e.id)) : [];
  const startSelecting = (meal: MealType, all: boolean) =>
    setSelecting({ meal, date: selectedDate, ids: new Set(all ? todaysEntries.filter((e) => e.meal === meal).map((e) => e.id) : []) });
  const toggleSelected = (id: string) =>
    setSelecting((cur) => {
      if (!cur) return cur;
      const ids = new Set(cur.ids);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      return { ...cur, ids };
    });

  const deleteSelected = async () => {
    if (!activeSelection) return;
    setBulkBusy(true);
    setDeleteError(null);
    const failed = new Set<string>();
    let offline = !online;
    for (const e of selectedEntries) {
      if (isRemoteEntryId(e.id)) {
        const result = await deleteDiaryEntry(e.id);
        if (!result.ok) {
          failed.add(e.id);
          if (result.message === OFFLINE_MESSAGE) offline = true;
          continue;
        }
      }
      removeFoodEntry(e.id);
    }
    setBulkBusy(false);
    setConfirmDelete(false);
    if (failed.size > 0) {
      setDeleteError(failedLine(tn(failed.size, "{n} item couldn't be deleted.", "{n} items couldn't be deleted."), offline));
      setSelecting({ ...activeSelection, ids: failed });
      return;
    }
    setSelecting(null);
  };

  const copySelected = async (day: string, meal: MealType) => {
    if (!activeSelection || !authUserId) return;
    setBulkBusy(true);
    let copied = 0;
    let offline = !online;
    for (const e of selectedEntries) {
      const result = await copyDiaryEntry(authUserId, e, day, meal);
      if (result.ok && result.entry) {
        addFoodEntryRecord(result.entry);
        copied++;
      } else if (result.message === OFFLINE_MESSAGE) offline = true;
    }
    setBulkBusy(false);
    setCopyOpen(false);
    if (copied < selectedEntries.length) {
      setDeleteError(failedLine(tn(selectedEntries.length - copied, "{n} item couldn't be copied.", "{n} items couldn't be copied."), offline));
      return;
    }
    setSelecting(null);
    setBulkToast(tn(copied, "Copied {n} item to {meal}, {date}.", "Copied {n} items to {meal}, {date}.", { meal: t(COPY_MEAL_LABEL[meal]), date: copyToastDate(day) }));
  };

  const handleUndo = () => {
    if (!undoState) return;
    undoState.ids.forEach((id) => void handleDelete(id));
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    setUndoState(null);
  };

  const firstLoad = diaryLoading && foodLog.length === 0;
  const noCacheError = !!diaryError && foodLog.length === 0;

  // The panel: the day, or the clicked food while it is still in the day.
  const panelItem = panelItemId ? todaysEntries.find((e) => e.id === panelItemId) ?? null : null;
  const panelTargets = targetsFromGoal(nutritionGoal);
  const panelData = useMemo(() => entryTotals(panelItem ? [panelItem] : todaysEntries), [panelItem, todaysEntries]);
  const nutrientData = {
    ...panelData,
    calorieTarget: panelTargets.calories,
    proteinTarget: panelTargets.protein,
    carbTarget: panelTargets.carbs,
    fatTarget: panelTargets.fat,
    bodyWeightKg: metricValues.weight ?? null,
    filter: "all" as const,
  };

  const servingLine = (e: FoodLogEntry) => `${e.quantity !== 1 ? `${e.quantity} × ` : ""}${e.unit && e.unit !== "serving" ? t(e.unit) : e.display.serving}`;

  const renderMeal = (meal: MealType) => {
    const entries = grouped[meal];
    const mealCal = entries.reduce((s, e) => s + e.calories, 0);
    const mealP = entries.reduce((s, e) => s + e.protein, 0);
    const mealC = entries.reduce((s, e) => s + e.carbs, 0);
    const mealF = entries.reduce((s, e) => s + e.fat, 0);
    const macroTotal = mealP + mealC + mealF || 1;
    const collapsed = collapsedMeals.has(meal);
    const showUndo = undoState?.meal === meal;
    const isAddingHere = addOpen && addMeal === meal;
    const label = t(mealLabels[meal]);
    const has = mealCal > 0;
    const headBg = collapsed ? "#FFFFFF" : "rgba(174,161,220,0.12)";
    return (
      <section
        key={meal}
        aria-label={label}
        className="flex flex-col overflow-hidden"
        style={{ borderRadius: 15, background: "#FFFFFF", border: "0.5px solid rgba(174,161,220,0.34)", boxShadow: "0 4px 14px rgba(95,80,147,0.08)" }}
        // Mobile's double-tap on a meal card copies yesterday's meal: here a
        // double-click on the card (not on one of its controls).
        onDoubleClick={(ev) => {
          if ((ev.target as HTMLElement).closest("button,[role=button],a,input")) return;
          void handleCopyYesterdayMeal(meal);
        }}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => toggleCollapsed(meal)}
          onKeyDown={(ev) => {
            if (ev.target !== ev.currentTarget) return;
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              toggleCollapsed(meal);
            }
          }}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t("Expand {section}", { section: label }) : t("Collapse {section}", { section: label })}
          className={clsx("w-full flex items-center cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] focus-visible:-outline-offset-2", collapsed ? "hover:!bg-[#F5F5F6]" : "hover:!bg-[rgba(174,161,220,0.18)]")}
          style={{ gap: 8, padding: "12px 16px", background: headBg, transition: "background-color .18s ease" }}
        >
          <span className="flex-1 min-w-0 flex items-center" style={{ gap: 8 }}>
            <h3 title={label} className="min-w-0 whitespace-nowrap overflow-hidden text-ellipsis" style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>
              {label}
            </h3>
            <button
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
                setMealMenu({ meal, anchor: ev.currentTarget });
              }}
              aria-label={t("{meal} options", { meal: label })}
              aria-haspopup="menu"
              className={clsx("flex items-center justify-center shrink-0 hover:!bg-[rgba(174,161,220,0.2)]", FOCUS)}
              style={{ width: 24, height: 24, borderRadius: 6, background: mealMenu?.meal === meal ? "rgba(174,161,220,0.2)" : "transparent", color: "#8C8378" }}
            >
              <EllipsisVertical size={16} />
            </button>
          </span>
          {!hideNumbers && (
            <span className="flex flex-col shrink-0" style={{ gap: 4, width: 124 }}>
              <span className="flex overflow-hidden" style={{ height: 8, borderRadius: 3, background: "rgba(36,31,27,0.07)" }}>
                {has && (
                  <>
                    <span style={{ width: `${(mealP / macroTotal) * 100}%`, background: SEG.p }} />
                    <span style={{ width: `${(mealC / macroTotal) * 100}%`, background: SEG.c }} />
                    <span style={{ width: `${(mealF / macroTotal) * 100}%`, background: SEG.f }} />
                  </>
                )}
              </span>
              <span className="flex items-center tabular-nums whitespace-nowrap" style={{ gap: 3, fontSize: 11, lineHeight: "16px", fontWeight: 700 }}>
                <span style={{ color: has ? INK.p : INK.none }}>{t("P {n}g", { n: Math.round(mealP) })}</span>
                <span aria-hidden style={{ color: "rgba(36,31,27,0.2)" }}>|</span>
                <span style={{ color: has ? INK.c : INK.none }}>{t("C {n}g", { n: Math.round(mealC) })}</span>
                <span aria-hidden style={{ color: "rgba(36,31,27,0.2)" }}>|</span>
                <span style={{ color: has ? INK.f : INK.none }}>{t("F {n}g", { n: Math.round(mealF) })}</span>
              </span>
            </span>
          )}
          {!hideNumbers && (
            <span className="shrink-0 text-end tabular-nums" style={{ width: 36, fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#5B5349" }}>
              {Math.round(mealCal)}
            </span>
          )}
          <ChevronDown size={16} aria-hidden className="shrink-0" style={{ color: "#8C8378", transform: collapsed ? "none" : "rotate(180deg)", transition: "transform 0.18s ease" }} />
        </div>

        {showUndo && (
          <div className="flex justify-end" style={{ background: headBg, padding: "0 16px 8px" }}>
            <button
              type="button"
              onClick={handleUndo}
              className={clsx("inline-flex items-center hover:!bg-[#EDEAE6]", FOCUS)}
              style={{ gap: 4, height: 28, padding: "0 10px", borderRadius: 999, background: "#F5F5F6", color: "#5B5349", fontSize: 13, lineHeight: "20px", fontWeight: 600 }}
            >
              <Undo2 size={14} aria-hidden /> {t("Undo")}
            </button>
          </div>
        )}

        {!collapsed && (
          <div className="flex flex-col" style={{ padding: "12px 16px 16px" }}>
            {isAddingHere && (
              <div className="flex items-center" style={{ gap: 8, borderRadius: 11, background: "rgba(162,200,194,0.13)", border: "0.5px dashed rgba(79,127,120,0.4)", padding: "9px 11px", marginBottom: 8 }}>
                <RefreshCw size={12} aria-hidden className="shrink-0" style={{ color: "#4F7F78" }} />
                <span style={{ fontSize: 13, lineHeight: "20px", color: "#3C6B65" }}>{t("Swipe right or double-tap to copy yesterday's {meal}", { meal: label.toLowerCase() })}</span>
              </div>
            )}
            {entries.length > 0 && (
              <div className="flex flex-col" style={{ gap: 8, marginBottom: 8 }}>
                {entries.map((e) => {
                  const inSelection = activeSelection?.meal === meal;
                  const checked = inSelection && activeSelection!.ids.has(e.id);
                  const restricted = !!dietaryRestriction && isFoodRestricted(e, dietaryRestriction);
                  const conflict = worstBadge(conflicts.get(e.id) ?? [], dietLabel);
                  const conflictBadge = conflict && !(restricted && (conflict.kind === "restriction" || conflict.kind === "preference")) ? conflict : null;
                  const flagged = restricted || conflictBadge?.kind === "allergy_confirmed";
                  const inPanel = !inSelection && panelItem?.id === e.id;
                  const entryFeedback = feedback.get(e.id) ?? [];
                  const choose = () => {
                    if (inSelection) toggleSelected(e.id);
                    else {
                      setPanelItemId(e.id);
                      setFullSummary(false);
                    }
                  };
                  return (
                    <div key={e.id} className="flex items-center" style={{ gap: inSelection ? 10 : 0 }}>
                      {inSelection && (
                        <button
                          type="button"
                          onClick={() => toggleSelected(e.id)}
                          role="checkbox"
                          aria-checked={checked}
                          aria-label={t("Select {name}", { name: e.name })}
                          className={clsx("shrink-0 flex items-center justify-center", FOCUS)}
                          style={{ width: 20, height: 20, borderRadius: 10, background: checked ? "#AEA1DC" : "#FFFFFF", border: checked ? "none" : "1.5px solid #D1CAEB", color: "#FFFFFF" }}
                        >
                          {checked && <Check size={12} strokeWidth={3} />}
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <div
                          role="button"
                          tabIndex={0}
                          aria-pressed={inSelection ? undefined : inPanel}
                          onClick={choose}
                          onKeyDown={(ev) => {
                            if (ev.target !== ev.currentTarget) return;
                            if (ev.key === "Enter" || ev.key === " ") {
                              ev.preventDefault();
                              choose();
                            }
                          }}
                          className={clsx(
                            "group/row relative flex items-center cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]",
                            flagged ? "bg-status-high-bg" : !inPanel && "hover:!bg-[rgba(174,161,220,0.18)]"
                          )}
                          style={{
                            gap: 10,
                            borderRadius: 12,
                            padding: "8px 12px",
                            minHeight: 60,
                            boxSizing: "border-box",
                            background: flagged ? undefined : inPanel ? "#F0EDF9" : "rgba(174,161,220,0.1)",
                            boxShadow: inPanel ? "inset 0 0 0 1px #AEA1DC" : "none",
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="flex items-center min-w-0" style={{ margin: 0, gap: 6, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>
                              <span className="min-w-0 truncate" title={e.name}>
                                {e.name}
                              </span>
                              {e.display.isLebanese && <Star size={12} aria-hidden className="text-gold fill-gold shrink-0" />}
                              {restricted && (
                                <span className="shrink-0 uppercase text-status-high bg-status-high-bg" style={{ fontSize: 11, lineHeight: "16px", fontWeight: 700, borderRadius: 999, padding: "1px 6px" }}>
                                  {t("Not compatible")}
                                </span>
                              )}
                              {conflictBadge && <FoodConflictBadge badge={conflictBadge} />}
                            </p>
                            <p className="truncate" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                              {servingLine(e)}
                              {isQueuedEntry(e.id) && <span className="font-bold text-status-caution"> · {t("Waiting to save")}</span>}
                            </p>
                          </div>
                          {!inSelection && (
                            <span className="hidden group-hover/row:flex group-focus-within/row:flex shrink-0" style={{ gap: 4 }}>
                              <button
                                type="button"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  void handleDelete(e.id);
                                }}
                                aria-label={t("Delete {name}", { name: e.name })}
                                title={t("Delete")}
                                className={clsx("grid place-items-center hover:!bg-[#FCEDEC]", FOCUS)}
                                style={{ width: 32, height: 32, borderRadius: 8, background: "#FFFFFF", color: "#B4372C" }}
                              >
                                <Trash2 size={16} aria-hidden />
                              </button>
                              <button
                                type="button"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setRowMenu({ entry: e, anchor: ev.currentTarget });
                                }}
                                aria-label={t("{name} options", { name: e.name })}
                                aria-haspopup="menu"
                                title={t("More")}
                                className={clsx("grid place-items-center hover:!bg-[#F0EDF9]", FOCUS)}
                                style={{ width: 32, height: 32, borderRadius: 8, background: "#FFFFFF", color: "#8C8378" }}
                              >
                                <EllipsisVertical size={16} aria-hidden />
                              </button>
                            </span>
                          )}
                          {!hideNumbers && (
                            <span className="shrink-0 tabular-nums" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#5B5349" }}>
                              {Math.round(e.calories)}
                            </span>
                          )}
                        </div>
                        {!inSelection && entryFeedback.map((f) => <FoodFeedbackLine key={f.id} f={f} onReplied={setFeedbackReply} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeSelection?.meal === meal && (
              <div className="flex items-center" style={{ gap: 8, marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={activeSelection.ids.size === 0}
                  className={clsx("flex-1 inline-flex items-center justify-center disabled:opacity-45", FOCUS)}
                  style={{ height: 40, gap: 6, borderRadius: 12, background: "#FCEDEC", border: "1px solid #F2CFCC", color: "#B4372C", fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
                >
                  <Trash2 size={16} aria-hidden /> {t("Delete ({n})", { n: activeSelection.ids.size })}
                </button>
                <button
                  type="button"
                  onClick={() => setCopyOpen(true)}
                  disabled={activeSelection.ids.size === 0}
                  className={clsx("flex-1 inline-flex items-center justify-center disabled:opacity-45", FOCUS)}
                  style={{ height: 40, gap: 6, borderRadius: 12, background: "#AEA1DC", color: "#FFFFFF", fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
                >
                  <Copy size={16} aria-hidden /> {t("Copy ({n})", { n: activeSelection.ids.size })}
                </button>
                <button
                  type="button"
                  onClick={() => setSelecting(null)}
                  className={clsx("shrink-0 hover:!bg-[#F5F5F6]", FOCUS)}
                  style={{ padding: "0 12px", height: 40, borderRadius: 12, color: "#8C8378", fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
                >
                  {t("Cancel")}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => openAdd(meal)}
              className={clsx("w-full flex items-center justify-center hover:!bg-[rgba(174,161,220,0.24)] active:scale-[0.96] transition-transform", FOCUS)}
              style={{ gap: 7, height: 40, borderRadius: 12, background: "rgba(174,161,220,0.16)", color: "#5F5093", fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
            >
              <Plus size={16} aria-hidden /> {entries.length > 0 ? t("Add more") : t("Add food")}
            </button>
          </div>
        )}
      </section>
    );
  };

  const macroRow = (label: string, value: number, target: number) => (
    <div key={label} className="contents">
      <span className="whitespace-nowrap" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#FFFFFF" }}>
        {t(label)}
      </span>
      <span className="flex-1 min-w-0 overflow-hidden" style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.28)" }}>
        <span className="block h-full" style={{ borderRadius: 999, background: "#FFFFFF", width: `${Math.min(100, (value / (target || 1)) * 100)}%` }} />
      </span>
      <span className="shrink-0 whitespace-nowrap tabular-nums" style={{ fontSize: 13, lineHeight: "20px", color: "rgba(255,255,255,0.78)" }}>
        {t("{value} / {target}g", { value: Math.round(value), target })}
      </span>
    </div>
  );

  const recoveryCard = (
    <div className="flex flex-col justify-center" style={{ borderRadius: 20, padding: "20px 24px", background: "#F5F5F6" }}>
      <p style={{ margin: "0 0 4px", fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>
        {todaysEntries.length === 0 ? t("Nothing logged yet today") : tn(todaysEntries.length, "{n} item logged today", "{n} items logged today")}
      </p>
      <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{t("Meals, notes, and how you're feeling, no calorie counting required.")}</p>
    </div>
  );

  const diary = firstLoad ? (
    <div role="status" aria-busy="true" aria-label={t("Diary, loading")} className="grid items-start" style={{ gridTemplateColumns: `repeat(${rail ? 8 : 12}, minmax(0, 1fr))`, columnGap: 24 }}>
      <div className="flex flex-col min-w-0" style={{ gridColumn: `span ${rail ? 4 : 8}`, gap: 24 }}>
        <div className="animate-skeleton-pulse bg-cream-soft" style={{ height: 140, borderRadius: 20 }} />
        <div className="animate-skeleton-pulse bg-cream-soft" style={{ height: 40, borderRadius: 12 }} />
        <div className="grid" style={{ gridTemplateColumns: `repeat(${rail ? 1 : 2}, minmax(0, 1fr))`, gap: 24 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="animate-skeleton-pulse bg-cream-soft" style={{ height: 120, borderRadius: 15 }} />
          ))}
        </div>
      </div>
      <div className="animate-skeleton-pulse bg-cream-soft" style={{ gridColumn: "span 4", height: 480, borderRadius: 16 }} />
    </div>
  ) : (
    <div className="grid items-start animate-fade-slide-up" style={{ gridTemplateColumns: `repeat(${rail ? 8 : 12}, minmax(0, 1fr))`, columnGap: 24 }}>
      <div className="flex flex-col min-w-0" style={{ gridColumn: `span ${rail ? 4 : 8}`, gap: 24 }}>
        {noCacheError && (
          <div role="alert" className="flex items-center justify-between" style={{ gap: 12, padding: "14px 16px", borderRadius: 15, background: "#FFFFFF", border: "0.5px solid rgba(174,161,220,0.34)" }}>
            <span style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>
              {online ? t("Couldn't load your diary.") : t("You're offline. Your diary will load when you reconnect.")}
            </span>
            <button type="button" onClick={retryDiary} className={clsx("shrink-0 hover:underline", FOCUS)} style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#5F5093" }}>
              {t("Retry")}
            </button>
          </div>
        )}

        {recoveryModePending ? (
          <div role="status" aria-busy="true" aria-label={t("Today, loading")} className="animate-skeleton-pulse bg-cream-soft" style={{ height: 140, borderRadius: 20 }} />
        ) : (
          !recoverySensitive && (
            <button
              type="button"
              onClick={() => {
                setPanelItemId(null);
                setFullSummary(true);
              }}
              aria-label={t("Open Nutrient Summary")}
              className={clsx("relative overflow-hidden w-full text-start hover:scale-[0.98] active:scale-[0.96]", FOCUS)}
              style={{ borderRadius: 20, padding: "20px 24px", background: "linear-gradient(150deg, #aea1dc, #6f5fa6)", transition: "transform .15s cubic-bezier(0.22,1,0.36,1)" }}
            >
              <div className="flex items-center" style={{ gap: 16 }}>
                <div className="shrink-0">
                  <p className="tabular-nums" style={{ margin: 0, fontSize: 26, lineHeight: 1, fontWeight: 800, letterSpacing: "-1px", color: "#FFFFFF" }}>
                    {Math.round(totals.calories).toLocaleString(appLocale())}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: "20px", color: "rgba(255,255,255,0.78)" }}>{t("of {n} kcal", { n: targets.calories.toLocaleString(appLocale()) })}</p>
                  {isReferenceOnlyTarget(user) && (
                    <p style={{ margin: "2px 0 0", maxWidth: rail ? 160 : 220, fontSize: 13, lineHeight: "20px", color: "rgba(255,255,255,0.72)" }}>{t(REFERENCE_INTAKE_NOTE)}</p>
                  )}
                  <p className="inline-block whitespace-nowrap" style={{ margin: "8px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#FFFFFF", background: "rgba(255,255,255,0.2)", borderRadius: 999, padding: "2px 10px" }}>
                    {Math.round(totals.calories) > targets.calories
                      ? t("{n} over", { n: Math.round(totals.calories) - targets.calories })
                      : t("{n} left", { n: targets.calories - Math.round(totals.calories) })}
                  </p>
                </div>
                {/* One grid for the three rows, so the bars line up after the widest label (56 at least; Arabic labels are wider). */}
                <div className="flex-1 min-w-0 grid items-center" style={{ gridTemplateColumns: "minmax(56px, max-content) minmax(0, 1fr) max-content", columnGap: 8, rowGap: 8, paddingInlineEnd: 24 }}>
                  {macroRow("Protein", totals.protein, targets.protein)}
                  {macroRow("Carbs", totals.carbs, targets.carbs)}
                  {macroRow("Fat", totals.fat, targets.fat)}
                </div>
              </div>
              <span aria-hidden className="absolute flex" style={{ insetInlineEnd: 16, top: "50%", transform: "translateY(-50%)" }}>
                <ChevronRight size={16} strokeWidth={2.4} color="#FFFFFF" />
              </span>
            </button>
          )
        )}

        {!hideNumbers && (
          <div className="flex" style={{ gap: 8 }}>
            {DIARY_ORDER.map((meal) => {
              const { label, fill, Icon } = QUICK[meal];
              return (
                <button
                  key={meal}
                  type="button"
                  onClick={() => openAdd(meal)}
                  className={clsx("flex-1 min-w-0 flex items-center justify-center whitespace-nowrap hover:scale-[0.98] active:scale-[0.96]", FOCUS)}
                  style={{ height: 40, padding: "0 6px", gap: 6, borderRadius: 12, background: fill, color: "#FFFFFF", fontSize: 15, lineHeight: "24px", fontWeight: 600, transition: "transform .15s cubic-bezier(0.22,1,0.36,1)" }}
                >
                  <Icon size={16} aria-hidden className="shrink-0" />
                  <span className="min-w-0 truncate">{t(label)}</span>
                </button>
              );
            })}
          </div>
        )}

        {(diaryError && !deleteError && !noCacheError) || deleteError ? (
          <p className="text-center text-status-high" style={{ margin: "-8px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 600 }}>
            {deleteError ? t(deleteError) : t("Couldn't refresh your diary. Showing what was saved on this device.")}
          </p>
        ) : null}

        <div className="grid items-start" style={{ gridTemplateColumns: `repeat(${rail ? 1 : 2}, minmax(0, 1fr))`, gap: 24 }}>
          {DIARY_ORDER.map(renderMeal)}
        </div>
      </div>

      <aside className="flex flex-col min-w-0" style={{ gridColumn: "span 4", gap: 12 }} aria-label={t("Nutrient Summary")}>
        {recoverySensitive && !recoveryModePending && recoveryCard}
        {!hideNumbers && (
          <>
            <div className="flex items-center" style={{ gap: 6, minHeight: 20 }}>
              {panelItem && (
                <button
                  type="button"
                  onClick={() => setPanelItemId(null)}
                  aria-label={t("Back to the day's summary")}
                  title={t("Back to the day's summary")}
                  className={clsx("grid place-items-center hover:!bg-[#F5F5F6]", FOCUS)}
                  style={{ width: 24, height: 24, marginInlineStart: -4, borderRadius: 999, color: "#5B5349" }}
                >
                  <ChevronLeft size={15} aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate("/app/food/nutrient-summary")}
                title={t("Open Nutrient Summary")}
                className={clsx("whitespace-nowrap uppercase hover:underline underline-offset-4", FOCUS)}
                style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 800, letterSpacing: "0.1em", color: "#6D50D3" }}
              >
                {t("Nutrient Summary")}
              </button>
            </div>
            {panelItem && (
              <div className="flex items-center" style={{ gap: 10, borderRadius: 12, padding: "8px 12px", background: "#F0EDF9", boxShadow: "inset 0 0 0 1px #AEA1DC" }}>
                <div className="flex-1 min-w-0">
                  <p className="truncate" title={panelItem.name} style={{ margin: 0, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>
                    {panelItem.name}
                  </p>
                  <p className="truncate" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                    {t(mealLabels[panelItem.meal])} · {servingLine(panelItem)}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#5B5349" }}>
                  {Math.round(panelItem.calories)}
                </span>
              </div>
            )}
            <div>
              <NutrientSectionsWeb key={panelItem ? `item-${panelItem.id}` : fullSummary ? "full" : "day"} data={nutrientData} layout="panel" openAll={fullSummary && !panelItem} />
              <p style={{ margin: "12px 2px 0", fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                {t("% Daily Value based on FDA reference values for adults. Calorie and macro targets come from your Goals.")}
              </p>
            </div>
          </>
        )}
      </aside>
    </div>
  );

  return (
    <div data-web-page="food">
      <header
        className="sticky top-0 flex items-center justify-between bg-white"
        style={{ zIndex: 30, height: 64, boxSizing: "border-box", gap: 24, paddingInline: margin, borderBottom: "1px solid rgba(36,31,27,0.06)" }}
      >
        <div className="flex-1 min-w-0 flex items-center" style={{ gap: 6 }}>
          <h1 className="whitespace-nowrap" style={{ margin: 0, fontSize: 24, lineHeight: "32px", fontWeight: 600, letterSpacing: "-0.6px", color: "#241F1B" }}>
            {t("Food")}
          </h1>
        </div>
        {tab === "diary" && !firstLoad && (
          <div className="shrink-0 [&>div]:!mb-0" style={{ width: 260 }}>
            <DateSelector partB />
          </div>
        )}
        <div className="flex-1 min-w-0 flex items-center justify-end" style={{ gap: 12 }}>
          {tab === "diary" && !share.locks.foodDayLocked && !hideNumbers && <DiaryShareButton share={share} date={selectedDate} />}
          {tab === "diary" && (
            <button
              type="button"
              onClick={() => openAdd(mealForCurrentTime(), null)}
              aria-label={t("Add Food")}
              title={t("Add Food")}
              className={clsx("shrink-0 flex items-center justify-center hover:scale-[0.98] active:scale-[0.96]", FOCUS)}
              style={{ width: 96, height: 44, borderRadius: 14, background: "#AEA1DC", boxShadow: "0 16px 40px rgba(125,107,181,0.4)", color: "#FFFFFF", transition: "transform .15s cubic-bezier(0.22,1,0.36,1)" }}
            >
              <Plus size={20} aria-hidden />
            </button>
          )}
        </div>
      </header>
      {share.sheet}

      <div className="mx-auto flex flex-col" style={{ maxWidth: WEB_CONTENT_MAX, boxSizing: "border-box", padding: `24px ${margin}px`, gap: 24 }}>
        <FoodWebTabs
          label={t("Food")}
          items={foodTabs.map((x) => ({ key: x.key, label: t(x.label) }))}
          active={tab}
          onChange={(k) => setTab(k as Tab)}
        />
        {tab === "diary" && diary}
        {tab === "goals" && <GoalsPanelWeb clientTargets={proTargets} onAllergiesSaved={() => setAllergyVersion((v) => v + 1)} />}
        {tab === "prep" && <CustomPanelWeb />}
      </div>

      <AddFoodSheet open={addOpen} onClose={() => setAddOpen(false)} defaultMeal={addMeal} suggestMeal={addFor} />
      <EditFoodEntrySheet open={!!editingEntry} onClose={() => setEditingEntry(null)} entry={editingEntry} />

      {mealMenu &&
        (() => {
          const mealEntries = todaysEntries.filter((e) => e.meal === mealMenu.meal);
          const empty = mealEntries.length === 0;
          const allChecked = activeSelection?.meal === mealMenu.meal && !empty && mealEntries.every((e) => activeSelection.ids.has(e.id));
          return (
            <FoodWebMenu
              anchor={mealMenu.anchor}
              onClose={() => setMealMenu(null)}
              width={192}
              label={t("{meal} options", { meal: t(mealLabels[mealMenu.meal]) })}
              options={[
                { value: "all", label: allChecked ? t("Deselect all") : t("Select all"), icon: <ListChecks size={16} />, disabled: empty },
                { value: "select", label: t("Select"), icon: <SquareDashedMousePointer size={16} />, disabled: empty },
              ]}
              onSelect={(v) => {
                const meal = mealMenu.meal;
                if (empty) return;
                if (v === "all") {
                  if (allChecked) setSelecting({ meal, date: selectedDate, ids: new Set() });
                  else startSelecting(meal, true);
                } else startSelecting(meal, false);
              }}
            />
          );
        })()}

      {rowMenu && (
        <FoodWebMenu
          anchor={rowMenu.anchor}
          onClose={() => setRowMenu(null)}
          width={156}
          align="end"
          label={t("{name} options", { name: rowMenu.entry.name })}
          options={[
            { value: "edit", label: t("Edit"), icon: <Pencil size={16} />, disabled: isQueuedEntry(rowMenu.entry.id) },
            { value: "delete", label: t("Delete"), icon: <Trash2 size={16} />, destructive: true },
          ]}
          onSelect={(v) => {
            if (v === "edit") setEditingEntry(rowMenu.entry);
            else void handleDelete(rowMenu.entry.id);
          }}
        />
      )}

      <ConfirmCard
        open={confirmDelete && !!activeSelection}
        title={tn(activeSelection?.ids.size ?? 0, "Delete {n} item from {meal}?", "Delete {n} items from {meal}?", { meal: activeSelection ? t(mealLabels[activeSelection.meal]) : "" })}
        subtitle={selectedDate === todayLocal() ? t("They'll be removed from today's diary.") : t("They'll be removed from this day's diary.")}
        busy={bulkBusy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void deleteSelected()}
      />

      {activeSelection && copyOpen && (
        <CopyToSheet open onClose={() => setCopyOpen(false)} count={activeSelection.ids.size} today={todayLocal()} meal={activeSelection.meal} busy={bulkBusy} onConfirm={(day, meal) => void copySelected(day, meal)} />
      )}

      <Toast open={!!bulkToast} message={bulkToast ?? ""} onExpire={() => setBulkToast(null)} />
      <Toast open={!!saveToast} message={t(saveToast ?? "")} icon={<AlertCircle size={16} style={{ color: "#C0392B" }} />} onExpire={() => setSaveToast(null)} />
    </div>
  );
}

