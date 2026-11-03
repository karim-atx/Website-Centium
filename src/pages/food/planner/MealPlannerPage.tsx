import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Pencil, Plus, StickyNote, Trash2, UtensilsCrossed, Soup } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Toast } from "../../../components/ui/Toast";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { PremiumLabel } from "../../../components/premium/PremiumAskHost";
import { G3Body } from "../../../components/premium/g3/parts";
import { askLocked, useG3 } from "../../../components/premium/g3/useG3";
import { G4Route } from "../../../components/premium/g4/parts";
import { useApp } from "../../../context/AppContext";
import { useHideNumbers } from "../../../hooks/useHideNumbers";
import { usePremium } from "../../../services/premium/hooks";
import { servingMultiplier } from "../../../services/nutrition";
import { divideTotals, sumItems, type PrepItem } from "../../../components/food/mealPrepShared";
import {
  addPlanItem,
  createPlan,
  deletePlan,
  deletePlanItem,
  fetchPlan,
  fetchPlanItems,
  reorderPlanItems,
  updatePlanItem,
} from "../../../services/premium/g4Calls";
import {
  canGoToPlanWeek,
  dayKcal,
  draftColumns,
  draftOf,
  itemDetail,
  itemKcal,
  itemTitle,
  itemsByMeal,
  mealName,
  moveItem,
  nextPosition,
  planWeekOf,
  shiftWeek,
  weekDays,
  type ItemDraft,
  type MealPlan,
  type MealSlot,
  type PlanItem,
} from "../../../services/premium/g4";
import { PlanItemSheet } from "./PlanItemSheet";
import { GroceryListSheet } from "./GroceryListSheet";
import { appLocale } from "../../../i18n/format";
import { t } from "../../../i18n/core";

// undrawn (Round G, no handover)
// Round G4 · /app/food/planner, the member's own meal planner: one plan per
// week (Monday start), each day's meals with recipes (servings), foods
// (amount and unit) and notes, reordered, edited and deleted here, and the
// week's grocery list (GroceryListSheet).
//
// - Separate from the coach-assigned meal plan (MealPlanCard, PlanBuilder),
//   which is unchanged.
// - Writing is Premium: a free member reads and deletes their own plans, and
//   every write control carries the Premium label and opens the prompt. A
//   write refused with ATXQ1 asks for the prompt and keeps what was entered.
// - Recovery-sensitive mode: no calorie numbers (useHideNumbers, itemKcal).

const longDay = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString(appLocale("en-US"), { weekday: "long", day: "numeric", month: "short" });
const shortDay = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString(appLocale("en-US"), { day: "numeric", month: "short" });
const fmt = (n: number) => new Intl.NumberFormat(appLocale("en-US")).format(n);

export default function MealPlannerPage() {
  return (
    <G4Route fallback="/app/food">
      <PlannerScreen />
    </G4Route>
  );
}

function PlannerScreen() {
  const { today, authUserId } = useApp();
  const [params, setParams] = useSearchParams();
  const asked = params.get("week");
  const thisWeek = planWeekOf(today);
  const week = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) && canGoToPlanWeek(planWeekOf(asked), today) ? planWeekOf(asked) : thisWeek;
  const goTo = (w: string) => setParams(w === thisWeek ? {} : { week: w }, { replace: true });
  const plan = useG3(() => fetchPlan(week), `plan:${week}`);
  const { premium } = usePremium();
  const locked = !premium?.premium;
  const [toast, setToast] = useState<{ message: string; tone?: "error" } | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!authUserId) return;
    if (locked) return askLocked("meal_planner");
    setBusy(true);
    const r = await createPlan(authUserId, week);
    setBusy(false);
    if (!r.ok) return setToast({ message: r.message, tone: "error" });
    plan.reload();
  };

  return (
    <div className="animate-fade-slide-up pb-10" data-g4="meal-planner-page">
      <PageHeader title={t("Meal planner")} showBack />
      <div className="mb-4 flex items-center justify-between gap-2 rounded-2xl bg-cream-card px-2 py-2 shadow-soft">
        <button
          type="button"
          aria-label={t("Previous week")}
          disabled={!canGoToPlanWeek(shiftWeek(week, -1), today)}
          onClick={() => goTo(shiftWeek(week, -1))}
          className="tap w-9 h-9 rounded-xl flex items-center justify-center text-charcoal-soft disabled:opacity-30"
        >
          <ChevronLeft size={18} aria-hidden />
        </button>
        <div className="min-w-0 text-center">
          <p className="text-[13.5px] font-bold text-charcoal">{t("Week of {day}", { day: shortDay(week) })}</p>
          {week !== thisWeek && (
            <button type="button" onClick={() => goTo(thisWeek)} className="tap text-[11.5px] font-semibold text-primary-deep-text underline">
              {t("Back to this week")}
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label={t("Next week")}
          disabled={!canGoToPlanWeek(shiftWeek(week, 1), today)}
          onClick={() => goTo(shiftWeek(week, 1))}
          className="tap w-9 h-9 rounded-xl flex items-center justify-center text-charcoal-soft disabled:opacity-30"
        >
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>

      <G3Body state={plan.state} onRetry={plan.reload}>
        {(p) =>
          p ? (
            <PlanWeek key={p.id} plan={p} locked={locked} onDeleted={plan.reload} />
          ) : (
            <div className="rounded-2xl bg-cream-card px-4 py-6 text-center shadow-soft">
              <p className="text-[13.5px] font-semibold text-charcoal">{t("Nothing planned for this week yet.")}</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void start()}
                className="tap mt-3 inline-flex items-center gap-2 rounded-full bg-primary-fill px-4 py-2 text-[13px] font-bold text-on-primary-fill disabled:opacity-50"
              >
                <Plus size={15} aria-hidden />
                {t("Plan this week")}
                {locked && <PremiumLabel />}
              </button>
            </div>
          )
        }
      </G3Body>
      <Toast open={!!toast} message={toast?.message ?? ""} tone={toast?.tone} onExpire={() => setToast(null)} />
    </div>
  );
}

type Editing = { mode: "add"; dayOffset: number; meal: MealSlot } | { mode: "edit"; item: PlanItem };

function PlanWeek({ plan, locked, onDeleted }: { plan: MealPlan; locked: boolean; onDeleted: () => void }) {
  const { recipes } = useApp();
  const hideNumbers = useHideNumbers();
  const items = useG3(() => fetchPlanItems(plan.id), `items:${plan.id}`);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [groceryOpen, setGroceryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone?: "error" } | null>(null);
  const days = weekDays(plan.weekStart);

  // A recipe's calories per serving, from the member's recipes (the app's own math).
  const recipeKcal = useMemo(() => {
    const m = new Map(recipes.map((r) => [r.id, divideTotals(sumItems(r.items as PrepItem[]), r.servings).kcal]));
    return (id: string) => m.get(id) ?? null;
  }, [recipes]);
  const kcalOf = (i: PlanItem) => itemKcal(i, { hideNumbers, recipeKcalPerServing: recipeKcal, multiplier: servingMultiplier });

  const guard = (fn: () => void) => () => (locked ? askLocked("meal_planner") : fn());

  const save = async (draft: ItemDraft, meal: MealSlot, list: PlanItem[]): Promise<string | null> => {
    if (locked) {
      askLocked("meal_planner");
      return t("That's part of Centium Premium.");
    }
    const cols = draftColumns(draft);
    if (!cols || !editing) return null;
    const r =
      editing.mode === "add"
        ? await addPlanItem(plan.id, editing.dayOffset, meal, nextPosition(list, editing.dayOffset, meal), cols)
        : await updatePlanItem(editing.item.id, { ...cols, ...(meal !== editing.item.meal ? { meal, position: nextPosition(list, editing.item.dayOffset, meal) } : {}) });
    if (!r.ok) return r.message;
    setEditing(null);
    items.reload();
    return null;
  };

  const move = async (list: PlanItem[], id: string, dir: -1 | 1) => {
    if (locked) return askLocked("meal_planner");
    const moves = moveItem(list, id, dir);
    if (!moves.length) return;
    setBusy(true);
    const r = await reorderPlanItems(moves);
    setBusy(false);
    if (!r.ok) setToast({ message: r.message, tone: "error" });
    items.reload();
  };

  // Deleting always works, Premium or not.
  const remove = async (id: string) => {
    setBusy(true);
    const r = await deletePlanItem(id);
    setBusy(false);
    if (!r.ok) return setToast({ message: r.message, tone: "error" });
    items.reload();
  };

  const removePlan = async () => {
    setBusy(true);
    const r = await deletePlan(plan.id);
    setBusy(false);
    setConfirmDelete(false);
    if (!r.ok) return setToast({ message: r.message, tone: "error" });
    onDeleted();
  };

  return (
    <>
      <button
        type="button"
        data-g4="grocery-open"
        onClick={() => setGroceryOpen(true)}
        className="tap mb-4 w-full flex items-center gap-3 rounded-2xl bg-cream-card px-4 py-3 text-start shadow-soft"
      >
        <span className="flex-1 min-w-0">
          <span className="block text-[13.5px] font-bold text-charcoal">{t("Grocery list")}</span>
          <span className="block text-[11.5px] text-charcoal-faint">{t("Everything this week's plan needs")}</span>
        </span>
        {locked ? <PremiumLabel className="shrink-0" /> : <ChevronRight size={16} aria-hidden className="shrink-0 text-charcoal-faint" />}
      </button>

      <G3Body state={items.state} onRetry={items.reload}>
        {(list) => (
          <div className="flex flex-col gap-3">
            {days.map((d, dayOffset) => {
              const groups = itemsByMeal(list, dayOffset);
              const total = dayKcal(
                groups.flatMap((g) => g.items.map(kcalOf)),
                hideNumbers
              );
              return (
                <section key={d} data-g4-day={dayOffset} className="rounded-2xl bg-cream-card px-4 py-3 shadow-soft">
                  <div className="flex items-center gap-2">
                    <h2 className="flex-1 min-w-0 text-[13.5px] font-bold text-charcoal">{longDay(d)}</h2>
                    {total !== null && <span className="text-[11.5px] font-semibold text-charcoal-faint">{t("{n} kcal", { n: fmt(total) })}</span>}
                    <button
                      type="button"
                      aria-label={t("Add to {day}", { day: longDay(d) })}
                      onClick={guard(() => setEditing({ mode: "add", dayOffset, meal: "breakfast" }))}
                      className="tap inline-flex items-center gap-1 rounded-full bg-primary-pale px-2.5 py-1 text-[12px] font-bold text-primary-deep-text"
                    >
                      <Plus size={13} aria-hidden />
                      {t("Add")}
                      {locked && <PremiumLabel />}
                    </button>
                  </div>
                  {groups.length === 0 ? (
                    <p className="mt-1.5 text-[12px] text-charcoal-faint">{t("Nothing planned.")}</p>
                  ) : (
                    groups.map((g) => (
                      <div key={g.meal} className="mt-2.5">
                        <p className="mb-1 text-[9.5px] font-bold uppercase tracking-[1.9px] rtl:tracking-normal text-charcoal-muted">{mealName(g.meal)}</p>
                        <ul className="flex flex-col gap-1">
                          {g.items.map((i, n) => {
                            const kcal = kcalOf(i);
                            const Icon = i.kind === "note" ? StickyNote : i.kind === "recipe" ? Soup : UtensilsCrossed;
                            return (
                              <li key={i.id} data-g4-item={i.kind} className="flex items-center gap-2 rounded-xl bg-cream-soft px-2.5 py-2">
                                <Icon size={14} aria-hidden className="shrink-0 text-charcoal-faint" />
                                <span className="flex-1 min-w-0">
                                  <span className="block text-[13px] font-semibold text-charcoal [overflow-wrap:anywhere]">{itemTitle(i)}</span>
                                  <span className="block text-[11px] text-charcoal-faint">
                                    {itemDetail(i, appLocale("en-US"))}
                                    {kcal !== null && ` · ${t("{n} kcal", { n: fmt(kcal) })}`}
                                  </span>
                                </span>
                                <span className="flex shrink-0 items-center">
                                  <IconButton label={t("Move up")} disabled={busy || n === 0} onClick={() => void move(list, i.id, -1)}>
                                    <ChevronUp size={15} aria-hidden />
                                  </IconButton>
                                  <IconButton label={t("Move down")} disabled={busy || n === g.items.length - 1} onClick={() => void move(list, i.id, 1)}>
                                    <ChevronDown size={15} aria-hidden />
                                  </IconButton>
                                  <IconButton label={t("Edit")} disabled={busy} onClick={guard(() => setEditing({ mode: "edit", item: i }))}>
                                    <Pencil size={14} aria-hidden />
                                  </IconButton>
                                  <IconButton label={t("Delete")} disabled={busy} onClick={() => void remove(i.id)}>
                                    <Trash2 size={14} aria-hidden />
                                  </IconButton>
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))
                  )}
                </section>
              );
            })}

            <button type="button" onClick={() => setConfirmDelete(true)} className="tap mt-2 self-center text-[12.5px] font-semibold text-status-high underline">
              {t("Delete this week's plan")}
            </button>

            <PlanItemSheet
              open={!!editing}
              initial={editing?.mode === "edit" ? draftOf(editing.item) : null}
              initialFoodName={editing?.mode === "edit" ? editing.item.name : null}
              meal={editing?.mode === "edit" ? editing.item.meal : editing?.meal ?? "breakfast"}
              dayLabel={editing ? longDay(days[editing.mode === "edit" ? editing.item.dayOffset : editing.dayOffset]) : ""}
              locked={locked}
              onClose={() => setEditing(null)}
              onSave={(draft, meal) => save(draft, meal, list)}
            />
          </div>
        )}
      </G3Body>

      <GroceryListSheet open={groceryOpen} planId={plan.id} onClose={() => setGroceryOpen(false)} />

      <ConfirmCard
        open={confirmDelete}
        title={t("Delete this week's plan?")}
        subtitle={t("Its meals and grocery ticks are deleted too.")}
        confirmLabel={t("Delete")}
        tone="destructive"
        busy={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void removePlan()}
      />
      <Toast open={!!toast} message={toast?.message ?? ""} tone={toast?.tone} onExpire={() => setToast(null)} />
    </>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="tap w-7 h-7 rounded-lg flex items-center justify-center text-charcoal-soft disabled:opacity-30">
      {children}
    </button>
  );
}
